import Pusher from "pusher-js/react-native";
import * as SecureStore from "expo-secure-store";
import { BROADCAST_CONFIG } from "@/constants/config";

let pusherInstance: Pusher | null = null;

export function getPusherClient(): Pusher {
  if (pusherInstance) return pusherInstance;

  pusherInstance = new Pusher(BROADCAST_CONFIG.key, {
    cluster: "",
    wsHost: BROADCAST_CONFIG.host,
    wsPort: BROADCAST_CONFIG.port,
    wssPort: BROADCAST_CONFIG.port,
    forceTLS: BROADCAST_CONFIG.forceTLS,
    enabledTransports: ["ws", "wss"],
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const token = await SecureStore.getItemAsync("auth_token");
          const res = await fetch(BROADCAST_CONFIG.authUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          });
          const data = await res.json();
          callback(null, data);
        } catch (err) {
          callback(err as Error, null);
        }
      },
    }),
  });

  return pusherInstance;
}

export function disconnectPusher(): void {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}
