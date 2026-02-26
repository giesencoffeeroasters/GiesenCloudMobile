/**
 * Routes incoming BLE notifications to the correct parser
 * based on function code and command byte.
 */

import {
  FUNC_DETECTION,
  FUNC_DEVICE_INFO,
  CMD_START_MEAS,
  CMD_BEAN_TYPE,
  CMD_MOISTURE_DENSITY,
  CMD_WATER_ACTIVITY,
  CMD_AGTRON,
  CMD_ENV_DATA,
  CMD_WATER_ACTIVITY_START,
  CMD_GET_SN,
  CMD_GET_VERSION,
  CMD_GET_MODEL,
  CMD_GET_BATTERY,
  MEAS_RESPONSE,
  validatePacket,
  extractPayload,
} from "./protocol";

import {
  parseBeanType,
  parseMoistureDensity,
  parseWaterActivity,
  parseAgtron,
  parseEnvironment,
  parseWaterActivityStart,
  type BeanTypeResult,
  type MoistureDensityResult,
  type WaterActivityResult,
  type AgtronResult,
  type EnvironmentResult,
} from "./parsers";

/* ------------------------------------------------------------------ */
/*  Event Types                                                        */
/* ------------------------------------------------------------------ */

export type DiFluidEvent =
  | { type: "measurement_started" }
  | { type: "measurement_failed" }
  | { type: "measurement_busy" }
  | { type: "bean_type"; data: BeanTypeResult }
  | { type: "moisture_density"; data: MoistureDensityResult }
  | { type: "water_activity"; data: WaterActivityResult }
  | { type: "agtron"; data: AgtronResult }
  | { type: "environment"; data: EnvironmentResult }
  | { type: "water_activity_start" }
  | { type: "serial_number"; data: string }
  | { type: "firmware_version"; data: string }
  | { type: "device_model"; data: string }
  | {
      type: "battery";
      data: {
        mainCharging: number;
        mainBattery: number;
        baseCharging: number;
        baseBattery: number;
      };
    }
  | { type: "unknown"; func: number; cmd: number };

/* ------------------------------------------------------------------ */
/*  Notification Callback Type                                         */
/* ------------------------------------------------------------------ */

export type NotificationCallback = (event: DiFluidEvent) => void;

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse a raw BLE notification and return a typed event.
 */
export function routeNotification(rawData: Uint8Array): DiFluidEvent | null {
  if (!validatePacket(rawData)) {
    return null;
  }

  const { func, cmd, payload } = extractPayload(rawData);

  // Detection function (0x03)
  if (func === FUNC_DETECTION) {
    switch (cmd) {
      case CMD_START_MEAS: {
        const status = payload[0];
        if (status === MEAS_RESPONSE.STARTED) return { type: "measurement_started" };
        if (status === MEAS_RESPONSE.BUSY) return { type: "measurement_busy" };
        return { type: "measurement_failed" };
      }
      case CMD_BEAN_TYPE:
        return { type: "bean_type", data: parseBeanType(payload) };
      case CMD_MOISTURE_DENSITY:
        return { type: "moisture_density", data: parseMoistureDensity(payload) };
      case CMD_WATER_ACTIVITY:
        return { type: "water_activity", data: parseWaterActivity(payload) };
      case CMD_AGTRON:
        return { type: "agtron", data: parseAgtron(payload) };
      case CMD_ENV_DATA:
        return { type: "environment", data: parseEnvironment(payload) };
      case CMD_WATER_ACTIVITY_START:
        parseWaterActivityStart(payload);
        return { type: "water_activity_start" };
    }
  }

  // Device info function (0x05)
  if (func === FUNC_DEVICE_INFO) {
    switch (cmd) {
      case CMD_GET_SN: {
        const sn = String.fromCharCode(...payload).replace(/\0/g, "");
        return { type: "serial_number", data: sn };
      }
      case CMD_GET_VERSION: {
        const ver = String.fromCharCode(...payload).replace(/\0/g, "");
        return { type: "firmware_version", data: ver };
      }
      case CMD_GET_MODEL: {
        const model = String.fromCharCode(...payload).replace(/\0/g, "");
        return { type: "device_model", data: model };
      }
      case CMD_GET_BATTERY:
        return {
          type: "battery",
          data: {
            mainCharging: payload[0],
            mainBattery: payload[1],
            baseCharging: payload[2],
            baseBattery: payload[3],
          },
        };
    }
  }

  return { type: "unknown", func, cmd };
}
