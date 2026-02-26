/**
 * DiFluid BLE response parsers.
 * Converts raw BLE notification payloads into typed measurement objects.
 *
 * All multi-byte values are Little Endian as per DiFluid protocol v1.1.
 */

/* ------------------------------------------------------------------ */
/*  Parsed Types                                                       */
/* ------------------------------------------------------------------ */

export interface BeanTypeResult {
  timestamp: number;
  historyId: number;
  beanType: number;
  detectWaterActivity: boolean;
  detectEnvironment: boolean;
}

export interface MoistureDensityResult {
  timestamp: number;
  historyId: number;
  dataVersion: number;
  beanType: number;
  screenSizeGrade: number;
  screenSizeDiameter: number;
  moisture: number;
  estimatedDensity: number;
  bulkDensity: number;
  weight: number;
}

export interface WaterActivityResult {
  timestamp: number;
  historyId: number;
  dataVersion: number;
  beanType: number;
  success: boolean;
  waterActivity: number;
  mirrorTemperature: number;
  beanTemperature: number;
}

export interface AgtronResult {
  timestamp: number;
  historyId: number;
  dataVersion: number;
  agtronRange: number;
  beanType: number;
  agtronMean: number;
  variance: number;
  roastStandard: number;
  barChart31: number[];
  pieChart8: number[];
}

export interface EnvironmentResult {
  timestamp: number;
  historyId: number;
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
}

export interface WaterActivityStartResult {
  startStatus: number;
}

/* ------------------------------------------------------------------ */
/*  Little-Endian Helpers                                              */
/* ------------------------------------------------------------------ */

function readUint64LE(buf: Uint8Array, offset: number): number {
  // JS can't natively handle uint64; we read the low 32 + high 32
  // For timestamps this is fine as they fit in Number.MAX_SAFE_INTEGER
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  const lo = view.getUint32(0, true);
  const hi = view.getUint32(4, true);
  return hi * 0x100000000 + lo;
}

function readInt32LE(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 4);
  return view.getInt32(0, true);
}

function readFloatLE(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 4);
  return view.getFloat32(0, true);
}

/* ------------------------------------------------------------------ */
/*  Parsers                                                            */
/* ------------------------------------------------------------------ */

/** Parse Bean Type Detection Result (Cmd 0x02, 15 bytes) */
export function parseBeanType(payload: Uint8Array): BeanTypeResult {
  return {
    timestamp: readUint64LE(payload, 0),
    historyId: readInt32LE(payload, 8),
    beanType: payload[12],
    detectWaterActivity: payload[13] === 1,
    detectEnvironment: payload[14] === 1,
  };
}

/** Parse Moisture & Density Result (Cmd 0x03, 44 bytes) */
export function parseMoistureDensity(
  payload: Uint8Array
): MoistureDensityResult {
  return {
    timestamp: readUint64LE(payload, 0),
    historyId: readInt32LE(payload, 8),
    dataVersion: payload[12],
    beanType: payload[13],
    screenSizeGrade: readInt32LE(payload, 16),
    screenSizeDiameter: readFloatLE(payload, 20),
    moisture: readFloatLE(payload, 24),
    estimatedDensity: readFloatLE(payload, 28),
    bulkDensity: readFloatLE(payload, 36),
    weight: readFloatLE(payload, 40),
  };
}

/** Parse Water Activity Result (Cmd 0x04, 32 bytes) */
export function parseWaterActivity(payload: Uint8Array): WaterActivityResult {
  return {
    timestamp: readUint64LE(payload, 0),
    historyId: readInt32LE(payload, 8),
    dataVersion: payload[12],
    beanType: payload[13],
    success: readInt32LE(payload, 16) === 1,
    waterActivity: readFloatLE(payload, 20),
    mirrorTemperature: readFloatLE(payload, 24),
    beanTemperature: readFloatLE(payload, 28),
  };
}

/** Parse Roast Degree / Agtron Result (Cmd 0x05, 120 bytes) */
export function parseAgtron(payload: Uint8Array): AgtronResult {
  const barChart31: number[] = [];
  for (let i = 81; i < 112; i++) {
    barChart31.push(payload[i]);
  }

  const pieChart8: number[] = [];
  for (let i = 112; i < 120; i++) {
    pieChart8.push(payload[i]);
  }

  return {
    timestamp: readUint64LE(payload, 0),
    historyId: readInt32LE(payload, 8),
    dataVersion: payload[12],
    agtronRange: payload[13],
    beanType: payload[15],
    agtronMean: readFloatLE(payload, 16),
    variance: readFloatLE(payload, 20),
    roastStandard: payload[80],
    barChart31,
    pieChart8,
  };
}

/** Parse Environment Data Result (Cmd 0x06, 28 bytes) */
export function parseEnvironment(payload: Uint8Array): EnvironmentResult {
  return {
    timestamp: readUint64LE(payload, 0),
    historyId: readInt32LE(payload, 8),
    temperature: readFloatLE(payload, 12),
    humidity: readInt32LE(payload, 16),
    pressure: readFloatLE(payload, 20),
    altitude: readInt32LE(payload, 24),
  };
}

/** Parse Water Activity Test Start Notification (Cmd 0x07, 1 byte) */
export function parseWaterActivityStart(
  payload: Uint8Array
): WaterActivityStartResult {
  return {
    startStatus: payload[0],
  };
}
