import { ExpoConfig, ConfigContext } from "expo/config";

const APP_ENV = process.env.APP_ENV || "development";

const envConfig = {
  development: {
    name: "GiesenCloud (Dev)",
    apiUrl: "https://giesencloud-development-d1q0tt.laravel.cloud/api/mobile/v1",
    reverbHost: "reverb.test",
    reverbKey: "laravel-herd",
    bundleIdentifier: "com.giesen.cloud.dev",
  },
  staging: {
    name: "GiesenCloud (Staging)",
    apiUrl: "https://staging.giesen.cloud/api/mobile/v1",
    reverbHost: "reverb.staging.giesen.cloud",
    reverbKey: "laravel-herd",
    bundleIdentifier: "com.giesen.cloud.staging",
  },
  production: {
    name: "GiesenCloud",
    apiUrl: "https://giesen.cloud/api/mobile/v1",
    reverbHost: "reverb.giesen.cloud",
    reverbKey: "laravel-herd",
    bundleIdentifier: "com.giesen.cloud",
  },
} as const;

const env = envConfig[APP_ENV as keyof typeof envConfig] ?? envConfig.development;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env.name,
  slug: "GiesenCloudMobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  scheme: "giesencloud",
  updates: {
    url: "https://u.expo.dev/17d21c66-42bf-44f3-9e7f-d7b4039c5050",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F0F2F4",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: env.bundleIdentifier,
    buildNumber: "2",
    icon: {
      dark: "./assets/icon-dark.png",
      tinted: "./assets/icon-tinted.png",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSBluetoothAlwaysUsageDescription:
        "GiesenCloud uses Bluetooth to connect to DiFluid Omix devices for coffee quality measurements.",
      NSCameraUsageDescription:
        "GiesenCloud uses the camera to take photos for maintenance evidence, service appointments, and support tickets.",
      NSPhotoLibraryUsageDescription:
        "GiesenCloud accesses your photo library to attach photos to maintenance tasks, service appointments, and support tickets.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#383838",
    },
    edgeToEdgeEnabled: true,
    package: "com.giesen.cloud",
    permissions: [
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        sounds: [],
      },
    ],
    "expo-image-picker",
    "react-native-ble-plx",
  ],
  extra: {
    appEnv: APP_ENV,
    apiUrl: env.apiUrl,
    reverbHost: env.reverbHost,
    reverbKey: env.reverbKey,
    eas: {
      projectId: "17d21c66-42bf-44f3-9e7f-d7b4039c5050",
    },
  },
});
