/**
 * Singleton BLE Manager for DiFluid Omix device communication.
 *
 * Handles scanning, connecting, disconnecting, writing commands,
 * and subscribing to notifications on the SDK characteristic.
 */

import { Platform, PermissionsAndroid } from "react-native";
import {
  BleManager,
  Device,
  State as BleState,
  type Subscription,
  BleErrorCode,
} from "react-native-ble-plx";
import {
  DIFLUID_SERVICE_UUID_SDK,
  DIFLUID_SERVICE_UUID_APP,
  DIFLUID_CHAR_UUID,
} from "./protocol";
import {
  routeNotification,
  type DiFluidEvent,
  type NotificationCallback,
} from "./notificationRouter";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number;
}

/* ------------------------------------------------------------------ */
/*  Singleton BLE Manager                                              */
/* ------------------------------------------------------------------ */

let _manager: BleManager | null = null;

function getManager(): BleManager {
  if (!_manager) {
    _manager = new BleManager();
  }
  return _manager;
}

/* ------------------------------------------------------------------ */
/*  Module State                                                       */
/* ------------------------------------------------------------------ */

let _connectedDevice: Device | null = null;
let _monitorSubscription: Subscription | null = null;
/** Extra monitor subscriptions for diagnostic discovery */
let _extraMonitorSubs: Subscription[] = [];
let _notificationCallback: NotificationCallback | null = null;
/** The actual service UUID resolved after connection (SDK 0x00E2 or App 0x00E1) */
let _resolvedServiceUuid: string | null = null;
/** The actual write characteristic UUID resolved after connection */
let _resolvedCharUuid: string | null = null;
/** The actual notify characteristic UUID resolved after connection */
let _resolvedNotifyCharUuid: string | null = null;
/** Optional debug logger — set via setDebugLogger */
let _debugLogger: ((msg: string) => void) | null = null;

/* ------------------------------------------------------------------ */
/*  Permissions                                                        */
/* ------------------------------------------------------------------ */

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS === "ios") {
    // iOS permissions are declared in Info.plist and requested on first BLE use
    return true;
  }

  if (Platform.OS === "android" && Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(results).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  if (Platform.OS === "android") {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

/* ------------------------------------------------------------------ */
/*  Scanning                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ensure the BLE adapter is powered on.
 * Rejects immediately for terminal states (Unsupported, Unauthorized, PoweredOff).
 * Waits up to `timeoutMs` for transient states (Unknown, Resetting).
 */
function ensurePoweredOn(
  manager: BleManager,
  timeoutMs = 10_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sub = manager.onStateChange((state) => {
      switch (state) {
        case BleState.PoweredOn:
          sub.remove();
          if (timer) clearTimeout(timer);
          resolve();
          break;
        case BleState.Unsupported:
          sub.remove();
          if (timer) clearTimeout(timer);
          reject(new Error("This device does not support Bluetooth Low Energy."));
          break;
        case BleState.Unauthorized:
          sub.remove();
          if (timer) clearTimeout(timer);
          reject(
            new Error(
              "Bluetooth permission not granted. Please enable Bluetooth access for this app in Settings."
            )
          );
          break;
        case BleState.PoweredOff:
          sub.remove();
          if (timer) clearTimeout(timer);
          reject(new Error("Bluetooth is turned off. Please enable Bluetooth in Settings."));
          break;
        // Unknown / Resetting — keep waiting
      }
    }, true); // `true` = emit current state immediately

    timer = setTimeout(() => {
      sub.remove();
      reject(new Error("Bluetooth did not become ready in time. Please check Bluetooth is enabled."));
    }, timeoutMs);
  });
}

/**
 * Check whether a discovered device is a DiFluid Omix.
 *
 * Identification strategy (per protocol spec):
 *   1. Service UUID `0x00E2` in the advertisement → definite match
 *   2. Device name containing "Omix" or "DiFluid" → name-based match
 */
function isDiFluidDevice(device: Device): boolean {
  // 1. Check advertised service UUIDs for either DiFluid UUID (0x00E1 or 0x00E2)
  const uuids = device.serviceUUIDs;
  if (uuids && uuids.length > 0) {
    for (const uuid of uuids) {
      const lower = uuid.toLowerCase();
      if (
        lower.startsWith("000000e2") || lower === "00e2" ||
        lower.startsWith("000000e1") || lower === "00e1"
      ) {
        return true;
      }
    }
  }

  // 2. Fall back to name matching
  const name = device.localName || device.name;
  if (name && (name.includes("Omix") || name.includes("DiFluid"))) {
    return true;
  }

  return false;
}

/**
 * Scan for DiFluid Omix devices.
 * Calls `onDeviceFound` for each unique device discovered.
 * Returns a stop function to cancel the scan.
 *
 * Per the DiFluid protocol spec:
 * - Device advertises service UUIDs 0x00E1 (Official) and 0x00E2 (SDK)
 * - Bluetooth name: "Omix XXXXXX" or "Omix Plus XXXXXX"
 */
export function startScan(
  onDeviceFound: (device: ScannedDevice) => void,
  onError?: (error: Error) => void,
  onDiagnostic?: (info: string) => void
): () => void {
  const manager = getManager();
  const seen = new Set<string>();
  let stopped = false;
  let totalDevicesSeen = 0;
  let namedDevicesSeen: string[] = [];

  ensurePoweredOn(manager)
    .then(async () => {
      if (stopped) return;
      onDiagnostic?.("BLE PoweredOn — starting scan…");

      // First check for already-connected DiFluid peripherals (e.g. if the
      // manufacturer's app connected the device). This uses CoreBluetooth's
      // retrieveConnectedPeripherals which finds devices connected system-wide.
      try {
        const connected = await manager.connectedDevices([DIFLUID_SERVICE_UUID_SDK]);
        onDiagnostic?.(`Found ${connected.length} already-connected peripheral(s) with SDK UUID`);
        for (const device of connected) {
          if (stopped) return;
          const name = device.localName || device.name;
          if (!seen.has(device.id)) {
            seen.add(device.id);
            onDeviceFound({
              id: device.id,
              name: name || "DiFluid Device",
              rssi: device.rssi ?? -50,
            });
          }
        }
      } catch {
        // Not critical — continue with normal scan
      }

      // Also check with the official app UUID (0x00E1)
      try {
        const officialUuid = "000000E1-0000-1000-8000-00805F9B34FB";
        const connected = await manager.connectedDevices([officialUuid]);
        onDiagnostic?.(`Found ${connected.length} already-connected peripheral(s) with Official UUID`);
        for (const device of connected) {
          if (stopped) return;
          if (!seen.has(device.id)) {
            const name = device.localName || device.name;
            seen.add(device.id);
            onDeviceFound({
              id: device.id,
              name: name || "DiFluid Device",
              rssi: device.rssi ?? -50,
            });
          }
        }
      } catch {
        // Not critical
      }

      if (stopped) return;

      // Scan all devices — we identify DiFluid devices by their advertised
      // service UUID (0x00E2) or by name. Using null filter ensures we don't
      // miss devices whose advertisement varies between platforms.
      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            if (error.errorCode === BleErrorCode.BluetoothPoweredOff) {
              onError?.(new Error("Bluetooth is turned off."));
            } else {
              onError?.(error);
            }
            return;
          }

          if (!device) return;

          totalDevicesSeen++;
          const name = device.localName || device.name;
          if (name && namedDevicesSeen.length < 20) {
            namedDevicesSeen.push(name);
          }

          if (!isDiFluidDevice(device)) return;

          if (seen.has(device.id)) return;
          seen.add(device.id);

          onDeviceFound({
            id: device.id,
            name: name || "DiFluid Device",
            rssi: device.rssi ?? -100,
          });
        }
      );

      // After 5 seconds, report diagnostic summary if no DiFluid devices found
      setTimeout(() => {
        if (stopped) return;
        const difluidCount = seen.size;
        const uniqueNames = [...new Set(namedDevicesSeen)];
        onDiagnostic?.(
          `Scan active — ${totalDevicesSeen} total device(s), ${difluidCount} DiFluid match(es). ` +
          `Named devices nearby: ${uniqueNames.length > 0 ? uniqueNames.join(", ") : "(none)"}`
        );
      }, 5000);
    })
    .catch((err) => {
      if (!stopped) {
        onError?.(err);
      }
    });

  return () => {
    stopped = true;
    manager.stopDeviceScan();
  };
}

/* ------------------------------------------------------------------ */
/*  Connection                                                         */
/* ------------------------------------------------------------------ */

/**
 * Connect to a DiFluid device by ID.
 * Discovers services, subscribes to notifications.
 */
export async function connectToDevice(
  deviceId: string,
  onEvent: NotificationCallback,
  onDisconnect?: () => void
): Promise<Device> {
  const manager = getManager();

  // Disconnect existing if any
  await disconnectDevice();

  // Connect
  const device = await manager.connectToDevice(deviceId, {
    requestMTU: 185, // enough for 120-byte Agtron + protocol overhead
  });

  // Discover services and characteristics
  await device.discoverAllServicesAndCharacteristics();

  // Resolve the service UUID: prefer SDK (0x00E2), fall back to App (0x00E1)
  const services = await device.services();
  const serviceUuids = services.map((s) => s.uuid.toLowerCase());

  const sdkUuid = DIFLUID_SERVICE_UUID_SDK.toLowerCase();
  const appUuid = DIFLUID_SERVICE_UUID_APP.toLowerCase();

  let resolvedUuid: string | null = null;
  for (const s of services) {
    const lower = s.uuid.toLowerCase();
    if (lower === sdkUuid || lower === "00e2" || lower.startsWith("000000e2")) {
      resolvedUuid = s.uuid;
      break;
    }
  }
  if (!resolvedUuid) {
    for (const s of services) {
      const lower = s.uuid.toLowerCase();
      if (lower === appUuid || lower === "00e1" || lower.startsWith("000000e1")) {
        resolvedUuid = s.uuid;
        break;
      }
    }
  }

  if (!resolvedUuid) {
    const available = serviceUuids.join(", ");
    _debugLogger?.(`No DiFluid service — available: ${available}`);
    throw new Error(
      `No DiFluid service found on device. Available services: ${available}`
    );
  }

  _debugLogger?.(`Resolved service: ${resolvedUuid}`);
  _debugLogger?.(`All services (${services.length}): ${serviceUuids.join(", ")}`);

  // Full device enumeration for diagnostics — log ALL services + chars
  for (const svc of services) {
    try {
      const chars = await svc.characteristics();
      const charSummary = chars.map((c) => {
        const p: string[] = [];
        if (c.isWritableWithResponse) p.push("W");
        if (c.isWritableWithoutResponse) p.push("WNR");
        if (c.isNotifiable) p.push("N");
        if (c.isIndicatable) p.push("I");
        if (c.isReadable) p.push("R");
        return `${c.uuid}[${p.join("+")}]`;
      });
      _debugLogger?.(`  svc ${svc.uuid}: ${charSummary.join(", ") || "(no chars)"}`);
    } catch {
      _debugLogger?.(`  svc ${svc.uuid}: (failed to enumerate chars)`);
    }
  }

  // Discover all characteristics on the resolved service
  const resolvedService = services.find((s) => s.uuid === resolvedUuid)!;
  const characteristics = await resolvedService.characteristics();

  // Find the write characteristic and notify characteristic (may be same or different)
  let writeCharUuid: string | null = null;
  let notifyCharUuid: string | null = null;

  // Build a summary for diagnostics
  const charInfo = characteristics.map((c) => {
    const props: string[] = [];
    if (c.isWritableWithResponse) props.push("W");
    if (c.isWritableWithoutResponse) props.push("WNR");
    if (c.isNotifiable) props.push("N");
    if (c.isIndicatable) props.push("I");
    if (c.isReadable) props.push("R");
    return `${c.uuid}[${props.join("+")}]`;
  });

  _debugLogger?.(`Characteristics: ${charInfo.join(", ")}`);

  // First try known UUID 0xFF02
  const knownCharLower = DIFLUID_CHAR_UUID.toLowerCase();
  for (const c of characteristics) {
    const lower = c.uuid.toLowerCase();
    if (lower === knownCharLower || lower === "ff02" || lower.startsWith("0000ff02")) {
      if (c.isWritableWithResponse || c.isWritableWithoutResponse) writeCharUuid = c.uuid;
      if (c.isNotifiable || c.isIndicatable) notifyCharUuid = c.uuid;
      break;
    }
  }

  // If not found, discover write and notify chars separately
  if (!writeCharUuid) {
    for (const c of characteristics) {
      if (c.isWritableWithResponse || c.isWritableWithoutResponse) {
        writeCharUuid = c.uuid;
        break;
      }
    }
  }
  if (!notifyCharUuid) {
    for (const c of characteristics) {
      if (c.isNotifiable || c.isIndicatable) {
        notifyCharUuid = c.uuid;
        break;
      }
    }
  }

  if (!writeCharUuid) {
    throw new Error(
      `No writable characteristic found on service ${resolvedUuid}. Characteristics: ${charInfo.join(", ")}`
    );
  }
  if (!notifyCharUuid) {
    throw new Error(
      `No notifiable characteristic found on service ${resolvedUuid}. Characteristics: ${charInfo.join(", ")}`
    );
  }

  _connectedDevice = device;
  _resolvedServiceUuid = resolvedUuid;
  _resolvedCharUuid = writeCharUuid;
  _resolvedNotifyCharUuid = notifyCharUuid;
  _notificationCallback = onEvent;

  _debugLogger?.(`Subscribing to notifications on char ${notifyCharUuid}`);

  // Subscribe to notifications (may be on a different characteristic than write)
  _monitorSubscription = device.monitorCharacteristicForService(
    resolvedUuid,
    notifyCharUuid,
    (error, characteristic) => {
      if (error) {
        _debugLogger?.(`Notify ERROR: ${error.message} (code=${error.errorCode})`);
        return;
      }
      if (!characteristic?.value) {
        _debugLogger?.("Notify: empty value");
        return;
      }

      const raw = base64ToUint8Array(characteristic.value);
      const hex = Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      _debugLogger?.(`Notify RX [${raw.length}B]: ${hex}`);
      const event = routeNotification(raw);
      if (event) {
        _debugLogger?.(`Parsed event: ${event.type}`);
        _notificationCallback?.(event);
      } else {
        _debugLogger?.("Notify: routeNotification returned null");
      }
    }
  );

  // Do NOT subscribe to other characteristics (e.g. 0xFF01 on 0x00E1).
  // The device identifies SDK connections by the 0xFF02 subscription alone.
  // Subscribing to the App characteristic confuses the device and it routes
  // responses to the encrypted App channel instead of the plaintext SDK channel.

  // Listen for disconnection
  manager.onDeviceDisconnected(deviceId, () => {
    _connectedDevice = null;
    _monitorSubscription?.remove();
    _monitorSubscription = null;
    for (const sub of _extraMonitorSubs) sub.remove();
    _extraMonitorSubs = [];
    onDisconnect?.();
  });

  return device;
}

/* ------------------------------------------------------------------ */
/*  Disconnect                                                         */
/* ------------------------------------------------------------------ */

export async function disconnectDevice(): Promise<void> {
  _monitorSubscription?.remove();
  _monitorSubscription = null;
  for (const sub of _extraMonitorSubs) sub.remove();
  _extraMonitorSubs = [];
  _notificationCallback = null;
  _resolvedServiceUuid = null;
  _resolvedCharUuid = null;
  _resolvedNotifyCharUuid = null;

  if (_connectedDevice) {
    const manager = getManager();
    try {
      await manager.cancelDeviceConnection(_connectedDevice.id);
    } catch {
      // Device may already be disconnected
    }
    _connectedDevice = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Write Command                                                      */
/* ------------------------------------------------------------------ */

/**
 * Write a command packet to the DiFluid device.
 * Tries Write With Response first, falls back to Write Without Response.
 */
export async function writeCommand(packet: Uint8Array): Promise<void> {
  if (!_connectedDevice || !_resolvedServiceUuid || !_resolvedCharUuid) {
    throw new Error("No DiFluid device connected");
  }

  const base64Data = uint8ArrayToBase64(packet);
  const hex = Array.from(packet).map((b) => b.toString(16).padStart(2, "0")).join(" ");
  _debugLogger?.(`Write TX [${packet.length}B]: ${hex}`);
  _debugLogger?.(`  → service=${_resolvedServiceUuid}, char=${_resolvedCharUuid}`);

  try {
    await _connectedDevice.writeCharacteristicWithResponseForService(
      _resolvedServiceUuid,
      _resolvedCharUuid,
      base64Data
    );
    _debugLogger?.("Write OK (with response)");
  } catch (writeErr) {
    _debugLogger?.(`Write-with-response failed: ${writeErr instanceof Error ? writeErr.message : writeErr}, trying without response…`);
    // Fall back to write without response
    try {
      await _connectedDevice.writeCharacteristicWithoutResponseForService(
        _resolvedServiceUuid,
        _resolvedCharUuid,
        base64Data
      );
      _debugLogger?.("Write OK (without response)");
    } catch (fallbackError) {
      const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      _debugLogger?.(`Write-without-response ALSO failed: ${msg}`);
      throw new Error(`BLE write failed: ${msg}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Connection State                                                   */
/* ------------------------------------------------------------------ */

export function isConnected(): boolean {
  return _connectedDevice !== null;
}

export function getConnectedDeviceId(): string | null {
  return _connectedDevice?.id ?? null;
}

/** Return diagnostic info about the current BLE connection. */
/** Set a debug logger that receives BLE-level events. */
export function setDebugLogger(logger: ((msg: string) => void) | null): void {
  _debugLogger = logger;
}

export function getConnectionInfo(): string {
  if (!_connectedDevice) return "Not connected";
  return [
    `Device: ${_connectedDevice.name || _connectedDevice.id}`,
    `Service: ${_resolvedServiceUuid ?? "none"}`,
    `Write char: ${_resolvedCharUuid ?? "none"}`,
    `Notify char: ${_resolvedNotifyCharUuid ?? "none"}`,
    `Monitor active: ${_monitorSubscription ? "yes" : "no"}`,
    `Extra monitors: ${_extraMonitorSubs.length}`,
  ].join("\n");
}

/**
 * Enumerate ALL services and characteristics on the connected device.
 * Logs via debug logger and subscribes to any unmonitored notifiable chars.
 */
export async function enumerateDevice(): Promise<string> {
  if (!_connectedDevice) return "Not connected";

  const lines: string[] = [];
  const services = await _connectedDevice.services();
  lines.push(`Total services: ${services.length}`);

  for (const svc of services) {
    try {
      const chars = await svc.characteristics();
      lines.push(`SVC ${svc.uuid}:`);
      if (chars.length === 0) {
        lines.push("  (no characteristics)");
        continue;
      }
      for (const c of chars) {
        const p: string[] = [];
        if (c.isWritableWithResponse) p.push("W");
        if (c.isWritableWithoutResponse) p.push("WNR");
        if (c.isNotifiable) p.push("N");
        if (c.isIndicatable) p.push("I");
        if (c.isReadable) p.push("R");
        lines.push(`  ${c.uuid} [${p.join("+")}]`);
      }
    } catch {
      lines.push(`SVC ${svc.uuid}: (failed)`);
    }
  }

  const result = lines.join("\n");
  _debugLogger?.(result);
  return result;
}

/* ------------------------------------------------------------------ */
/*  Cleanup                                                            */
/* ------------------------------------------------------------------ */

export function destroyManager(): void {
  disconnectDevice();
  if (_manager) {
    _manager.destroy();
    _manager = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Base64 Helpers                                                     */
/* ------------------------------------------------------------------ */

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    result += BASE64_CHARS[(b0 >> 2) & 0x3f];
    result += BASE64_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f];
    result += i + 1 < len ? BASE64_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f] : "=";
    result += i + 2 < len ? BASE64_CHARS[b2 & 0x3f] : "=";
  }
  return result;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }

  // Strip padding
  const stripped = base64.replace(/=/g, "");
  const byteLen = (stripped.length * 3) >> 2;
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < stripped.length; i += 4) {
    const c0 = lookup[stripped.charCodeAt(i)];
    const c1 = lookup[stripped.charCodeAt(i + 1)];
    const c2 = lookup[stripped.charCodeAt(i + 2)];
    const c3 = lookup[stripped.charCodeAt(i + 3)];

    bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (p < byteLen) bytes[p++] = ((c1 & 0xf) << 4) | (c2 >> 2);
    if (p < byteLen) bytes[p++] = ((c2 & 0x3) << 6) | c3;
  }
  return bytes;
}
