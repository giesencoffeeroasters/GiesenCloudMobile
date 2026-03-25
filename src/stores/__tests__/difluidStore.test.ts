import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("expo-secure-store", () => ({
  __esModule: true,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => null),
}));

const storeMeasurement = jest.fn();
const batchStoreMeasurements = jest.fn();
const linkMeasurement = jest.fn();

jest.mock("@/api/difluid", () => ({
  __esModule: true,
  storeMeasurement: (...args: unknown[]) => storeMeasurement(...args),
  batchStoreMeasurements: (...args: unknown[]) => batchStoreMeasurements(...args),
  linkMeasurement: (...args: unknown[]) => linkMeasurement(...args),
}));

jest.mock("@/services/difluid/bleManager", () => ({
  __esModule: true,
  requestBlePermissions: jest.fn(async () => true),
  startScan: jest.fn(),
  connectToDevice: jest.fn(),
  disconnectDevice: jest.fn(),
}));

jest.mock("@/services/difluid/commands", () => ({
  __esModule: true,
  startMeasurement: jest.fn(),
}));

import { useDiFluidStore } from "../difluidStore";

describe("difluidStore roast sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useDiFluidStore.setState({
      connectionStatus: "connected",
      connectedDevice: { id: "device-1", name: "Omix", rssi: -55 },
      scanResults: [],
      scanDiagnostic: "",
      deviceInfo: {},
      currentMeasurement: {
        coffeeType: "roasted",
        moisture: 10.5,
      },
      measurementComplete: true,
      awaitingWaterActivity: false,
      measurements: [],
      pendingSync: [],
    });
  });

  it("keeps a roast UUID in the batch payload after a failed immediate sync", async () => {
    const roastId = "a8cf8f9d-d5f8-44df-81f4-59e39f6d7a61";

    storeMeasurement.mockImplementationOnce(async () => {
      throw new Error("network down");
    });
    batchStoreMeasurements.mockImplementationOnce(async () => []);

    await useDiFluidStore.getState().saveMeasurement("roast", roastId);
    await useDiFluidStore.getState().syncPending();

    expect(batchStoreMeasurements).toHaveBeenCalledWith([
      expect.objectContaining({
        measurable_type: "roast",
        measurable_id: roastId,
      }),
    ]);
  });
});
