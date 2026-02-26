/**
 * Zustand store for DiFluid Omix BLE device + measurements.
 */

import { Alert } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type {
  DiFluidDevice,
  DiFluidConnectionStatus,
  DiFluidCoffeeType,
  DiFluidMeasurement,
} from "@/types/index";
import {
  requestBlePermissions,
  startScan as bleScan,
  connectToDevice,
  disconnectDevice,
  type ScannedDevice,
} from "@/services/difluid/bleManager";
import { startMeasurement } from "@/services/difluid/commands";
import type { DiFluidEvent } from "@/services/difluid/notificationRouter";
import {
  storeMeasurement,
  batchStoreMeasurements,
  linkMeasurement as linkMeasurementApi,
} from "@/api/difluid";

const LAST_DEVICE_KEY = "difluid_last_device";

/* ------------------------------------------------------------------ */
/*  Store Interface                                                    */
/* ------------------------------------------------------------------ */

interface DiFluidState {
  // Connection
  connectionStatus: DiFluidConnectionStatus;
  connectedDevice: DiFluidDevice | null;
  scanResults: DiFluidDevice[];
  scanDiagnostic: string;
  deviceInfo: {
    serialNumber?: string;
    firmwareVersion?: string;
    model?: string;
    mainBattery?: number;
    baseBattery?: number;
  };

  // Current measurement session
  currentMeasurement: Partial<DiFluidMeasurement> | null;
  measurementComplete: boolean;
  awaitingWaterActivity: boolean;

  // Local history & offline queue
  measurements: DiFluidMeasurement[];
  pendingSync: DiFluidMeasurement[];

  // Actions
  startScan: () => void;
  stopScan: () => void;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  autoConnect: () => Promise<void>;
  measure: (coffeeType: DiFluidCoffeeType) => Promise<void>;
  saveMeasurement: (
    linkedType?: "inventory" | "roast",
    linkedId?: string | number
  ) => Promise<void>;
  syncPending: () => Promise<void>;
  linkMeasurement: (
    measurementId: number,
    type: "inventory" | "roast",
    measurableId: string | number
  ) => Promise<void>;
  clearCurrent: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `df_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

let _stopScan: (() => void) | null = null;

export const useDiFluidStore = create<DiFluidState>((set, get) => ({
  connectionStatus: "disconnected",
  connectedDevice: null,
  scanResults: [],
  scanDiagnostic: "",
  deviceInfo: {},
  currentMeasurement: null,
  measurementComplete: false,
  awaitingWaterActivity: false,
  measurements: [],
  pendingSync: [],

  startScan: async () => {
    const granted = await requestBlePermissions();
    if (!granted) {
      Alert.alert(
        "Bluetooth Permission",
        "Bluetooth permission is required to scan for DiFluid devices. Please enable it in Settings."
      );
      return;
    }

    set({ connectionStatus: "scanning", scanResults: [], scanDiagnostic: "" });

    _stopScan = bleScan(
      (device: ScannedDevice) => {
        set((state) => {
          if (state.scanResults.some((d) => d.id === device.id)) return state;
          return { scanResults: [...state.scanResults, device] };
        });
      },
      (error) => {
        console.warn("[DiFluid] Scan error:", error.message);
        Alert.alert("Scan Error", error.message);
        set({ connectionStatus: "disconnected" });
      },
      (diagnostic) => {
        set({ scanDiagnostic: diagnostic });
      }
    );
  },

  stopScan: () => {
    _stopScan?.();
    _stopScan = null;
    set((state) => ({
      connectionStatus:
        state.connectionStatus === "scanning"
          ? "disconnected"
          : state.connectionStatus,
    }));
  },

  connect: async (deviceId: string) => {
    const { stopScan } = get();
    stopScan();

    set({ connectionStatus: "connecting" });

    try {
      const handleEvent = (event: DiFluidEvent) => {
        const state = get();
        switch (event.type) {
          case "measurement_started":
            set({ connectionStatus: "measuring" });
            break;
          case "measurement_failed":
          case "measurement_busy":
            set({
              connectionStatus: "connected",
              currentMeasurement: null,
            });
            break;
          case "bean_type":
            set({
              currentMeasurement: {
                ...state.currentMeasurement,
                beanType: event.data.beanType,
              },
              awaitingWaterActivity: event.data.detectWaterActivity,
            });
            break;
          case "moisture_density":
            set({
              currentMeasurement: {
                ...state.currentMeasurement,
                moisture: event.data.moisture,
                density: event.data.estimatedDensity,
                bulkDensity: event.data.bulkDensity,
                screenSizeGrade: event.data.screenSizeGrade,
                weight: event.data.weight,
              },
            });
            break;
          case "water_activity":
            set({
              currentMeasurement: {
                ...state.currentMeasurement,
                waterActivity: event.data.success
                  ? event.data.waterActivity
                  : undefined,
                mirrorTemperature: event.data.mirrorTemperature,
                beanTemperature: event.data.beanTemperature,
              },
              awaitingWaterActivity: false,
              measurementComplete: true,
              connectionStatus: "connected",
            });
            break;
          case "water_activity_start":
            set({ awaitingWaterActivity: true });
            break;
          case "agtron":
            set({
              currentMeasurement: {
                ...state.currentMeasurement,
                agtronNumber: event.data.agtronMean,
                variance: event.data.variance,
                roastStandard: event.data.roastStandard,
                barChart31: event.data.barChart31,
                pieChart8: event.data.pieChart8,
              },
            });
            // If not awaiting water activity, measurement is complete
            if (!state.awaitingWaterActivity) {
              set({
                measurementComplete: true,
                connectionStatus: "connected",
              });
            }
            break;
          case "environment":
            set({
              currentMeasurement: {
                ...state.currentMeasurement,
                temperature: event.data.temperature,
                humidity: event.data.humidity,
                pressure: event.data.pressure,
                altitude: event.data.altitude,
              },
            });
            break;
          case "serial_number":
            set({
              deviceInfo: { ...state.deviceInfo, serialNumber: event.data },
            });
            break;
          case "firmware_version":
            set({
              deviceInfo: { ...state.deviceInfo, firmwareVersion: event.data },
            });
            break;
          case "device_model":
            set({
              deviceInfo: { ...state.deviceInfo, model: event.data },
            });
            break;
          case "battery":
            set({
              deviceInfo: {
                ...state.deviceInfo,
                mainBattery: event.data.mainBattery,
                baseBattery: event.data.baseBattery,
              },
            });
            break;
        }
      };

      await connectToDevice(deviceId, handleEvent, () => {
        set({
          connectionStatus: "disconnected",
          connectedDevice: null,
        });
      });

      const device = get().scanResults.find((d) => d.id === deviceId);
      set({
        connectionStatus: "connected",
        connectedDevice: device ?? { id: deviceId, name: "Omix", rssi: -100 },
      });

      // Persist device ID for auto-reconnect
      SecureStore.setItemAsync(LAST_DEVICE_KEY, deviceId).catch(() => {});
    } catch (error) {
      console.error("[DiFluid] Connection failed:", error);
      set({ connectionStatus: "disconnected" });
      throw error;
    }
  },

  disconnect: async () => {
    await disconnectDevice();
    set({
      connectionStatus: "disconnected",
      connectedDevice: null,
    });
  },

  autoConnect: async () => {
    const { connectionStatus, connect } = get();
    if (connectionStatus !== "disconnected") return;

    const granted = await requestBlePermissions();
    if (!granted) return;

    const lastDeviceId = await SecureStore.getItemAsync(LAST_DEVICE_KEY).catch(() => null);

    set({ connectionStatus: "scanning", scanResults: [], scanDiagnostic: "" });

    // Auto-scan; if last device found, auto-connect
    _stopScan = bleScan(
      (device: ScannedDevice) => {
        set((state) => {
          if (state.scanResults.some((d) => d.id === device.id)) return state;
          return { scanResults: [...state.scanResults, device] };
        });

        // Auto-connect to the last known device
        if (lastDeviceId && device.id === lastDeviceId) {
          _stopScan?.();
          _stopScan = null;
          connect(device.id).catch(() => {});
        }
      },
      () => {
        set({ connectionStatus: "disconnected" });
      },
      (diagnostic) => {
        set({ scanDiagnostic: diagnostic });
      }
    );

    // Stop scanning after 10s if nothing auto-connected
    setTimeout(() => {
      const { connectionStatus: current } = get();
      if (current === "scanning") {
        _stopScan?.();
        _stopScan = null;
        set({ connectionStatus: "disconnected" });
      }
    }, 10_000);
  },

  measure: async (coffeeType: DiFluidCoffeeType) => {
    set({
      connectionStatus: "measuring",
      currentMeasurement: { coffeeType },
      measurementComplete: false,
      awaitingWaterActivity: false,
    });
    await startMeasurement(coffeeType);
  },

  saveMeasurement: async (linkedType, linkedId) => {
    const { currentMeasurement, connectedDevice } = get();
    if (!currentMeasurement) return;

    const measurement: DiFluidMeasurement = {
      id: generateId(),
      coffeeType: currentMeasurement.coffeeType ?? "auto",
      moisture: currentMeasurement.moisture,
      waterActivity: currentMeasurement.waterActivity,
      density: currentMeasurement.density,
      bulkDensity: currentMeasurement.bulkDensity,
      agtronNumber: currentMeasurement.agtronNumber,
      scaColorValue: currentMeasurement.scaColorValue,
      variance: currentMeasurement.variance,
      roastStandard: currentMeasurement.roastStandard,
      barChart31: currentMeasurement.barChart31,
      pieChart8: currentMeasurement.pieChart8,
      screenSizeGrade: currentMeasurement.screenSizeGrade,
      screenSizeDiameter: currentMeasurement.screenSizeDiameter,
      weight: currentMeasurement.weight,
      mirrorTemperature: currentMeasurement.mirrorTemperature,
      beanTemperature: currentMeasurement.beanTemperature,
      temperature: currentMeasurement.temperature,
      humidity: currentMeasurement.humidity,
      pressure: currentMeasurement.pressure,
      altitude: currentMeasurement.altitude,
      beanType: currentMeasurement.beanType,
      linkedInventoryId:
        linkedType === "inventory" ? linkedId : undefined,
      linkedRoastId: linkedType === "roast" ? linkedId : undefined,
      deviceIdentifier: connectedDevice?.id,
      measuredAt: new Date().toISOString(),
    };

    // Add to local history
    set((state) => ({
      measurements: [measurement, ...state.measurements],
      currentMeasurement: null,
      measurementComplete: false,
    }));

    // Try to sync immediately
    try {
      const payload: Record<string, unknown> = {
        coffee_type: measurement.coffeeType,
        moisture: measurement.moisture,
        water_activity: measurement.waterActivity,
        density: measurement.density,
        bulk_density: measurement.bulkDensity,
        agtron_number: measurement.agtronNumber,
        sca_color_value: measurement.scaColorValue,
        variance: measurement.variance,
        roast_standard: measurement.roastStandard,
        bar_chart_31: measurement.barChart31,
        pie_chart_8: measurement.pieChart8,
        screen_size_grade: measurement.screenSizeGrade,
        screen_size_diameter: measurement.screenSizeDiameter,
        weight: measurement.weight,
        mirror_temperature: measurement.mirrorTemperature,
        bean_temperature: measurement.beanTemperature,
        temperature: measurement.temperature,
        humidity: measurement.humidity,
        pressure: measurement.pressure,
        altitude: measurement.altitude,
        device_identifier: measurement.deviceIdentifier,
        measured_at: measurement.measuredAt,
      };

      if (linkedType && linkedId) {
        payload.measurable_type = linkedType;
        payload.measurable_id = linkedId;
      }

      await storeMeasurement(payload as any);

      // Mark as synced
      set((state) => ({
        measurements: state.measurements.map((m) =>
          m.id === measurement.id
            ? { ...m, syncedAt: new Date().toISOString() }
            : m
        ),
      }));
    } catch {
      // Failed to sync — add to pending queue
      set((state) => ({
        pendingSync: [...state.pendingSync, measurement],
      }));
    }
  },

  syncPending: async () => {
    const { pendingSync } = get();
    if (pendingSync.length === 0) return;

    try {
      await batchStoreMeasurements(
        pendingSync.map((m) => {
          const payload: Record<string, unknown> = {
            coffee_type: m.coffeeType,
            moisture: m.moisture,
            water_activity: m.waterActivity,
            density: m.density,
            bulk_density: m.bulkDensity,
            agtron_number: m.agtronNumber,
            sca_color_value: m.scaColorValue,
            variance: m.variance,
            roast_standard: m.roastStandard,
            bar_chart_31: m.barChart31,
            pie_chart_8: m.pieChart8,
            screen_size_grade: m.screenSizeGrade,
            screen_size_diameter: m.screenSizeDiameter,
            weight: m.weight,
            mirror_temperature: m.mirrorTemperature,
            bean_temperature: m.beanTemperature,
            temperature: m.temperature,
            humidity: m.humidity,
            pressure: m.pressure,
            altitude: m.altitude,
            device_identifier: m.deviceIdentifier,
            measured_at: m.measuredAt,
          };

          if (m.linkedInventoryId) {
            payload.measurable_type = "inventory";
            payload.measurable_id = m.linkedInventoryId;
          } else if (m.linkedRoastId) {
            payload.measurable_type = "roast";
            payload.measurable_id = m.linkedRoastId;
          }

          return payload;
        }) as any
      );

      const syncedIds = new Set(pendingSync.map((m) => m.id));
      const now = new Date().toISOString();
      set((state) => ({
        pendingSync: state.pendingSync.filter((m) => !syncedIds.has(m.id)),
        measurements: state.measurements.map((m) =>
          syncedIds.has(m.id) ? { ...m, syncedAt: now } : m
        ),
      }));
    } catch {
      // Sync failed — keep in pending queue
    }
  },

  linkMeasurement: async (measurementId, type, measurableId) => {
    await linkMeasurementApi(measurementId, type, measurableId);
  },

  clearCurrent: () => {
    set({
      currentMeasurement: null,
      measurementComplete: false,
      awaitingWaterActivity: false,
    });
  },
}));
