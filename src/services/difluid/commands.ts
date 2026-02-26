/**
 * High-level command functions for DiFluid Omix device.
 *
 * These wrap the low-level packet building and BLE write calls
 * into simple async functions.
 */

import {
  buildPacket,
  FUNC_DETECTION,
  FUNC_DEVICE_INFO,
  CMD_START_MEAS,
  CMD_GET_SN,
  CMD_GET_VERSION,
  CMD_GET_MODEL,
  CMD_GET_BATTERY,
  COFFEE_TYPE_MAP,
  type CoffeeTypeCode,
} from "./protocol";
import { writeCommand } from "./bleManager";

/* ------------------------------------------------------------------ */
/*  Detection Commands                                                 */
/* ------------------------------------------------------------------ */

/**
 * Start a measurement with the given coffee type.
 * Results will arrive via BLE notifications.
 *
 * @param coffeeType - "green" | "roasted" | "ground" | "auto"
 */
export async function startMeasurement(
  coffeeType: "green" | "roasted" | "ground" | "auto"
): Promise<void> {
  const code: CoffeeTypeCode = COFFEE_TYPE_MAP[coffeeType];
  if (code === undefined) {
    throw new Error(`Unknown coffee type: ${coffeeType}`);
  }
  const packet = buildPacket(FUNC_DETECTION, CMD_START_MEAS, [code]);
  await writeCommand(packet);
}

/* ------------------------------------------------------------------ */
/*  Device Info Commands                                               */
/* ------------------------------------------------------------------ */

/**
 * Request the device serial number.
 * Response arrives via notification with type "serial_number".
 */
export async function getSerialNumber(): Promise<void> {
  const packet = buildPacket(FUNC_DEVICE_INFO, CMD_GET_SN);
  await writeCommand(packet);
}

/**
 * Request the firmware version.
 * Response arrives via notification with type "firmware_version".
 */
export async function getFirmwareVersion(): Promise<void> {
  const packet = buildPacket(FUNC_DEVICE_INFO, CMD_GET_VERSION);
  await writeCommand(packet);
}

/**
 * Request the device model.
 * Response arrives via notification with type "device_model".
 */
export async function getDeviceModel(): Promise<void> {
  const packet = buildPacket(FUNC_DEVICE_INFO, CMD_GET_MODEL);
  await writeCommand(packet);
}

/**
 * Request battery status.
 * Response arrives via notification with type "battery".
 */
export async function getBatteryStatus(): Promise<void> {
  const packet = buildPacket(FUNC_DEVICE_INFO, CMD_GET_BATTERY);
  await writeCommand(packet);
}
