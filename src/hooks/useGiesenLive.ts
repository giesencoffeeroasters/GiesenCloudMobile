import { useEffect, useRef } from "react";
import { getPusherClient } from "@/services/pusher";
import { useLiveStore } from "@/stores/liveStore";
import { useAuthStore } from "@/stores/authStore";

const DISCONNECT_TIMEOUT_MS = 10_000;
const CHECK_INTERVAL_MS = 2_000;

export function useGiesenLive(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getPusherClient>["subscribe"]
  > | null>(null);

  const teamId = useAuthStore((s) => s.user?.current_team?.id);
  const processBatch = useLiveStore((s) => s.processBatch);
  const markDisconnected = useLiveStore((s) => s.markDisconnected);
  const setConnected = useLiveStore((s) => s.setConnected);
  const clearAll = useLiveStore((s) => s.clearAll);

  useEffect(() => {
    if (!teamId) return;

    const pusher = getPusherClient();
    const channelName = `private-team.${teamId}.giesen-live`;

    // Track connection state
    const handleStateChange = (states: {
      current: string;
      previous: string;
    }) => {
      setConnected(states.current === "connected");
    };
    pusher.connection.bind("state_change", handleStateChange);

    // Subscribe to the private channel
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("batch.received", (data: any) => {
      processBatch(data);
    });

    // Disconnect check interval
    intervalRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const devices = useLiveStore.getState().devices;
      devices.forEach((reading) => {
        if (
          reading.lastConnected &&
          now - reading.lastConnected >= DISCONNECT_TIMEOUT_MS / 1000
        ) {
          markDisconnected(reading.machineId);
        }
      });
    }, CHECK_INTERVAL_MS);

    // Set connected if already connected
    if (pusher.connection.state === "connected") {
      setConnected(true);
    }

    return () => {
      pusher.connection.unbind("state_change", handleStateChange);
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearAll();
    };
  }, [teamId]);
}
