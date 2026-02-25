import { ExpoConfig, ConfigContext } from "expo/config";

const APP_ENV = process.env.APP_ENV || "development";

const envConfig = {
  development: {
    name: "GiesenCloud (Dev)",
    apiUrl: "https://giesencloud.test/api/mobile/v1",
    reverbHost: "reverb.test",
    reverbKey: "laravel-herd",
  },
  staging: {
    name: "GiesenCloud (Staging)",
    apiUrl: "https://staging.giesen.cloud/api/mobile/v1",
    reverbHost: "reverb.staging.giesen.cloud",
    reverbKey: "laravel-herd",
  },
  production: {
    name: "GiesenCloud",
    apiUrl: "https://giesen.cloud/api/mobile/v1",
    reverbHost: "reverb.giesen.cloud",
    reverbKey: "laravel-herd",
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
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F0F2F4",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.giesen.cloud",
    icon: {
      dark: "./assets/icon-dark.png",
      tinted: "./assets/icon-tinted.png",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      ...(APP_ENV === "development" && {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            "giesencloud.test": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
          },
        },
      }),
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#383838",
    },
    edgeToEdgeEnabled: true,
    package: "com.giesen.cloud",
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
