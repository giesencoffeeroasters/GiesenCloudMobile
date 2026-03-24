import { describe, expect, it, jest, afterEach } from "@jest/globals";

describe("config startup environment", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("starts on production even when build and stored environments differ", async () => {
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            appEnv: "development",
          },
        },
      },
    }));

    jest.doMock("expo-secure-store", () => ({
      __esModule: true,
      getItemAsync: jest.fn(async () => "staging"),
      setItemAsync: jest.fn(async () => null),
    }));

    const config = await import("../config");

    expect(config.getActiveEnv()).toBe("production");

    await config.initActiveServer();

    expect(config.getActiveEnv()).toBe("production");
  });

  it("allows changing the active environment for the current session", async () => {
    const setItemAsync = jest.fn(async () => null);

    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            appEnv: "development",
          },
        },
      },
    }));

    jest.doMock("expo-secure-store", () => ({
      __esModule: true,
      getItemAsync: jest.fn(async () => null),
      setItemAsync,
    }));

    const config = await import("../config");

    config.setActiveEnv("staging");

    expect(config.getActiveEnv()).toBe("staging");
    expect(setItemAsync).toHaveBeenCalledWith("active_server_env", "staging");
  });
});
