import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const extra = Constants.expoConfig?.extra ?? {};

export type AppEnv = "development" | "staging" | "production";

export const BUILD_ENV: AppEnv = extra.appEnv ?? "development";

export const SERVER_OPTIONS: Record<
  AppEnv,
  { label: string; apiUrl: string; reverbHost: string; reverbKey: string }
> = {
  development: {
    label: "Development",
    apiUrl: "https://giesencloud-development-d1q0tt.laravel.cloud/api/mobile/v1",
    reverbHost: "reverb.test",
    reverbKey: "laravel-herd",
  },
  staging: {
    label: "Staging",
    apiUrl: "https://staging.giesen.cloud/api/mobile/v1",
    reverbHost: "reverb.staging.giesen.cloud",
    reverbKey: "laravel-herd",
  },
  production: {
    label: "Production",
    apiUrl: "https://giesen.cloud/api/mobile/v1",
    reverbHost: "reverb.giesen.cloud",
    reverbKey: "laravel-herd",
  },
};

const ACTIVE_SERVER_KEY = "active_server_env";

let _activeEnv: AppEnv = BUILD_ENV;
let _initialized = false;

/** Load persisted server choice. Call once at app startup. */
export async function initActiveServer(): Promise<void> {
  if (_initialized) return;
  try {
    const stored = await SecureStore.getItemAsync(ACTIVE_SERVER_KEY);
    if (stored && stored in SERVER_OPTIONS) {
      _activeEnv = stored as AppEnv;
    }
  } catch {
    // ignore
  }
  _initialized = true;
}

export function getActiveEnv(): AppEnv {
  return _activeEnv;
}

export function setActiveEnv(env: AppEnv): void {
  _activeEnv = env;
  SecureStore.setItemAsync(ACTIVE_SERVER_KEY, env).catch(() => {});
}

export function getApiBaseUrl(): string {
  return SERVER_OPTIONS[_activeEnv].apiUrl;
}

/** Kept for backwards-compat with existing imports */
export const APP_ENV = BUILD_ENV;
export const APP_NAME = "GiesenCloud";
export const API_BASE_URL: string =
  extra.apiUrl ?? "https://giesencloud-development-d1q0tt.laravel.cloud/api/mobile/v1";

export const BROADCAST_CONFIG = {
  key: extra.reverbKey ?? "laravel-herd",
  host: extra.reverbHost ?? "reverb.test",
  port: 443,
  forceTLS: true,
  get authUrl() {
    return `${getApiBaseUrl()}/broadcasting/auth`;
  },
};
