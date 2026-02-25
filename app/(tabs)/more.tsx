import { useEffect } from "react";
import { router } from "expo-router";

/**
 * More screen — replaced by the hamburger drawer menu.
 * This file must exist for Expo Router but redirects to the dashboard.
 */
export default function MoreScreen() {
  useEffect(() => {
    router.replace("/(tabs)");
  }, []);

  return null;
}
