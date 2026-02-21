import { create } from "zustand";

export interface DeviceReading {
  machineId: string;
  readings: {
    beans?: number;
    air?: number;
    power?: number;
    speed?: number;
    ror?: number;
    pressure?: number;
  };
  status: "Roasting" | "Replaying" | "Recording" | "Connected" | "Disconnected";
  selectedProfile: { id: string; name: string } | null;
  lastConnected: number | null;
  errors: Record<string, boolean>;
}

interface LiveState {
  devices: Map<string, DeviceReading>;
  isConnected: boolean;
  processBatch: (data: BatchPayload) => void;
  markDisconnected: (machineId: string) => void;
  clearAll: () => void;
  setConnected: (val: boolean) => void;
}

interface BatchPayload {
  machineId: string;
  readings: any[];
  receivedAt: number;
}

function getStatusFromReading(
  reading: any
): "Roasting" | "Replaying" | "Recording" | "Connected" {
  if (reading.isRoasting) return "Roasting";
  if (reading.isReplaying) return "Replaying";
  if (reading.isRecording) return "Recording";
  return "Connected";
}

export const useLiveStore = create<LiveState>((set) => ({
  devices: new Map(),
  isConnected: false,

  processBatch: (data: BatchPayload) => {
    const { machineId, readings, receivedAt } = data;
    if (!readings || !Array.isArray(readings) || readings.length === 0) return;

    const latest = readings[readings.length - 1];
    const status = getStatusFromReading(latest);

    set((state) => {
      const next = new Map(state.devices);
      next.set(machineId, {
        machineId,
        readings: latest.values?.readings ?? {},
        status,
        selectedProfile: latest.selectedProfile ?? null,
        lastConnected: receivedAt,
        errors: latest.values?.errors ?? {},
      });
      return { devices: next };
    });
  },

  markDisconnected: (machineId: string) => {
    set((state) => {
      const existing = state.devices.get(machineId);
      if (!existing || existing.status === "Disconnected") return state;

      const next = new Map(state.devices);
      next.set(machineId, {
        ...existing,
        status: "Disconnected",
        readings: {},
        selectedProfile: null,
        lastConnected: null,
        errors: {},
      });
      return { devices: next };
    });
  },

  clearAll: () => {
    set({ devices: new Map(), isConnected: false });
  },

  setConnected: (val: boolean) => {
    set({ isConnected: val });
  },
}));
