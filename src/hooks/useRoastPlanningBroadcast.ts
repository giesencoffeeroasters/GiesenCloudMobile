import { useEffect, useRef } from "react";
import { getPusherClient } from "@/services/pusher";
import { useAuthStore } from "@/stores/authStore";
import type { PlanningItem } from "@/types";

export function useRoastPlanningBroadcast(
  onPlanningUpdated: (item: PlanningItem) => void
): void {
  const teamId = useAuthStore((s) => s.user?.current_team?.id);
  const callbackRef = useRef(onPlanningUpdated);
  callbackRef.current = onPlanningUpdated;

  useEffect(() => {
    if (!teamId) return;

    const pusher = getPusherClient();
    const channelName = `private-team.${teamId}.roast-planning`;

    const channel = pusher.subscribe(channelName);

    channel.bind("planning.updated", (data: PlanningItem) => {
      callbackRef.current(data);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [teamId]);
}
