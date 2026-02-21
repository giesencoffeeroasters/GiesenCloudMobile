export const API_BASE_URL = __DEV__
  ? "https://giesencloud.test/api/mobile/v1"
  : "https://staging.giesen.cloud/api/mobile/v1";

export const APP_NAME = "GiesenCloud";

export const BROADCAST_CONFIG = {
  key: "laravel-herd",
  host: __DEV__ ? "reverb.herd.test" : "reverb.staging.giesen.cloud",
  port: 443,
  forceTLS: true,
  authUrl: `${API_BASE_URL}/broadcasting/auth`,
};
