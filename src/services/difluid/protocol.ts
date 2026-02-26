/**
 * DiFluid CB101 BLE Protocol Constants & Packet Builder
 * Protocol Version: 1.1.0 (Firmware V021)
 */

/* ------------------------------------------------------------------ */
/*  BLE UUIDs                                                          */
/* ------------------------------------------------------------------ */

/** SDK dedicated service UUID (128-bit form of 0x00E2) */
export const DIFLUID_SERVICE_UUID_SDK = "000000E2-0000-1000-8000-00805F9B34FB";

/** Official App service UUID (128-bit form of 0x00E1) */
export const DIFLUID_SERVICE_UUID_APP = "000000E1-0000-1000-8000-00805F9B34FB";

/** Data characteristic UUID (128-bit form of 0xFF02) — Write + Notify */
export const DIFLUID_CHAR_UUID = "0000FF02-0000-1000-8000-00805F9B34FB";

/** Both service UUIDs for scanning/connection */
export const DIFLUID_SERVICE_UUIDS = [DIFLUID_SERVICE_UUID_SDK, DIFLUID_SERVICE_UUID_APP] as const;

/* ------------------------------------------------------------------ */
/*  Protocol Header                                                    */
/* ------------------------------------------------------------------ */

export const HEADER_BYTE = 0xdf;

/* ------------------------------------------------------------------ */
/*  Function Codes                                                     */
/* ------------------------------------------------------------------ */

export const FUNC_DETECTION = 0x03;
export const FUNC_DEVICE_INFO = 0x05;

/* ------------------------------------------------------------------ */
/*  Detection Commands (Func 0x03)                                     */
/* ------------------------------------------------------------------ */

export const CMD_START_MEAS = 0x01;
export const CMD_BEAN_TYPE = 0x02;
export const CMD_MOISTURE_DENSITY = 0x03;
export const CMD_WATER_ACTIVITY = 0x04;
export const CMD_AGTRON = 0x05;
export const CMD_ENV_DATA = 0x06;
export const CMD_WATER_ACTIVITY_START = 0x07;

/* ------------------------------------------------------------------ */
/*  Device Info Commands (Func 0x05)                                   */
/* ------------------------------------------------------------------ */

export const CMD_GET_SN = 0x09;
export const CMD_GET_VERSION = 0x0b;
export const CMD_GET_MODEL = 0x0c;
export const CMD_GET_BATTERY = 0x1d;

/* ------------------------------------------------------------------ */
/*  Coffee Type Codes                                                  */
/* ------------------------------------------------------------------ */

export const COFFEE_TYPE = {
  GENERAL: 0x00,
  CHERRY: 0x01,
  PARCHMENT: 0x02,
  GREEN_BEAN: 0x03,
  ROASTED_BEAN: 0x04,
  GROUND: 0x05,
  AUTO: 0x06,
} as const;

export type CoffeeTypeCode = (typeof COFFEE_TYPE)[keyof typeof COFFEE_TYPE];

/** Map from app-friendly names to protocol codes */
export const COFFEE_TYPE_MAP: Record<string, CoffeeTypeCode> = {
  green: COFFEE_TYPE.GREEN_BEAN,
  roasted: COFFEE_TYPE.ROASTED_BEAN,
  ground: COFFEE_TYPE.GROUND,
  auto: COFFEE_TYPE.AUTO,
};

/* ------------------------------------------------------------------ */
/*  Start Measurement Response Codes                                   */
/* ------------------------------------------------------------------ */

export const MEAS_RESPONSE = {
  FAILED: 0x00,
  STARTED: 0x01,
  BUSY: 0x02,
} as const;

/* ------------------------------------------------------------------ */
/*  Roast Degree Standards                                             */
/* ------------------------------------------------------------------ */

export const ROAST_STANDARD = {
  COMMON: 0,
  SCAA: 1,
} as const;

/* ------------------------------------------------------------------ */
/*  Charging Status                                                    */
/* ------------------------------------------------------------------ */

export const CHARGING_STATUS = {
  ERROR: 0,
  NOT_CHARGING: 1,
  CHARGING: 2,
  FULLY_CHARGED: 3,
} as const;

/* ------------------------------------------------------------------ */
/*  Checksum                                                           */
/* ------------------------------------------------------------------ */

/**
 * Calculate DiFluid protocol checksum.
 * Sum of all bytes, take lower 8 bits.
 */
export function calculateChecksum(data: number[]): number {
  let sum = 0;
  for (const byte of data) {
    sum += byte;
  }
  return sum & 0xff;
}

/* ------------------------------------------------------------------ */
/*  Packet Builder                                                     */
/* ------------------------------------------------------------------ */

/**
 * Build a DiFluid protocol packet.
 *
 * Format: [0xDF, 0xDF, func, cmd, dataLen, ...data, checksum]
 */
export function buildPacket(
  func: number,
  cmd: number,
  data: number[] = []
): Uint8Array {
  const packet = [HEADER_BYTE, HEADER_BYTE, func, cmd, data.length, ...data];
  const cs = calculateChecksum(packet);
  packet.push(cs);
  return new Uint8Array(packet);
}

/* ------------------------------------------------------------------ */
/*  Packet Validation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Validate an incoming packet's header and checksum.
 * Returns true if the packet is valid.
 */
export function validatePacket(data: Uint8Array): boolean {
  if (data.length < 6) return false;
  if (data[0] !== HEADER_BYTE || data[1] !== HEADER_BYTE) return false;

  const dataLen = data[4];
  const expectedLen = 5 + dataLen + 1; // header(2)+func+cmd+len + data + checksum
  if (data.length < expectedLen) return false;

  const checksumIndex = 5 + dataLen;
  const computed = calculateChecksum(Array.from(data.slice(0, checksumIndex)));
  return computed === data[checksumIndex];
}

/**
 * Extract the payload portion from a validated packet.
 */
export function extractPayload(data: Uint8Array): {
  func: number;
  cmd: number;
  payload: Uint8Array;
} {
  return {
    func: data[2],
    cmd: data[3],
    payload: data.slice(5, 5 + data[4]),
  };
}
