import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

type AppEnv = "development" | "staging" | "production";

export const APP_ENV: AppEnv = extra.appEnv ?? "development";

export const APP_NAME = "GiesenCloud";

export const API_BASE_URL: string =
  extra.apiUrl ?? "https://giesencloud.test/api/mobile/v1";

export const BROADCAST_CONFIG = {
  key: extra.reverbKey ?? "laravel-herd",
  host: extra.reverbHost ?? "reverb.herd.test",
  port: 443,
  forceTLS: true,
  authUrl: `${API_BASE_URL}/broadcasting/auth`,
};
