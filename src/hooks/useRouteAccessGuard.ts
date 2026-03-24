import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { hasRequiredAccess } from "@/lib/featureAccess";
import type { AccessCapabilityKey, AccessFeatureKey } from "@/types";

const FALLBACK_ROUTE = "/(tabs)";

type RouteAccessGuard = {
  capability?: AccessCapabilityKey;
  feature?: AccessFeatureKey;
  requiresCapabilities?: AccessCapabilityKey[];
  requiresFeatures?: AccessFeatureKey[];
};

export function useRouteAccessGuard(access: RouteAccessGuard): void {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasAccess = hasRequiredAccess(user, {
    requiresCapabilities: access.requiresCapabilities ?? (access.capability ? [access.capability] : []),
    requiresFeatures: access.requiresFeatures ?? (access.feature ? [access.feature] : []),
  });

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    if (!hasAccess) {
      router.replace(FALLBACK_ROUTE);
    }
  }, [hasAccess, isLoading, user]);
}
