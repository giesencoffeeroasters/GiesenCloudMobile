import { useEffect, useRef } from "react";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Navigate to the appropriate screen based on notification data.
 */
function getNavigationRoute(data: Record<string, any>): string | null {
  const type = data?.type;
  const innerData = data?.data;

  switch (type) {
    case "ticket_status_changed":
    case "ticket_new_message":
      // Tickets don't have a mobile screen yet, go to notifications
      return "/notifications";
    case "asset_added":
      if (innerData?.device_id) {
        return `/equipment/${innerData.device_id}`;
      }
      return "/notifications";
    case "service_appointment_status_changed":
      return "/notifications";
    case "maintenance_task_due_soon":
    case "maintenance_task_overdue":
      if (innerData?.task_id) {
        return `/maintenance/${innerData.task_id}`;
      }
      return "/(tabs)/maintenance";
    case "warranty_compliance_warning":
    case "warranty_voided":
      if (innerData?.warranty_id) {
        return `/maintenance/warranty/${innerData.warranty_id}`;
      }
      return "/(tabs)/maintenance";
    default:
      return "/notifications";
  }
}

/**
 * Register for push notifications and get the Expo push token.
 */
async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Create Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ccff00",
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}

/**
 * Send the push token to the backend.
 */
async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await apiClient.post("/device/push-token", {
      token,
      device_type: Platform.OS,
      device_name: `${Device.modelName ?? Device.deviceName ?? Platform.OS}`,
    });
  } catch (error) {
    console.error("Failed to register push token:", error);
  }
}

/**
 * Hook to manage push notifications lifecycle.
 * Call this in the root layout when the user is authenticated.
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register and send token to backend
    registerForPushNotifications().then((token) => {
      if (token) {
        sendTokenToBackend(token);
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((_notification) => {
        // Notification received in foreground — handled by setNotificationHandler above
      });

    // Listen for notification taps (user interaction)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const route = getNavigationRoute(data);
        if (route) {
          router.push(route as any);
        }
      });

    // Handle cold-start notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        const route = getNavigationRoute(data);
        if (route) {
          // Small delay to ensure navigation is ready
          setTimeout(() => router.push(route as any), 500);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(
          responseListener.current
        );
      }
    };
  }, [isAuthenticated]);

  // Clear badge when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        Notifications.setBadgeCountAsync(0);
      }
    });

    return () => subscription.remove();
  }, []);
}

/**
 * Get the current Expo push token (for use during logout).
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch {
    return null;
  }
}
