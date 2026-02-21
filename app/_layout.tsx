import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/authStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    "DMSans-Regular": require("../assets/fonts/DMSans-Regular.ttf"),
    "DMSans-Medium": require("../assets/fonts/DMSans-Medium.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
    "JetBrainsMono-Regular": require("../assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
    "JetBrainsMono-Bold": require("../assets/fonts/JetBrainsMono-Bold.ttf"),
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, isLoading]);

  useEffect(() => {
    if (!appReady) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const authenticatedRoutes = ["notifications", "roasts", "planning", "quality", "inventory", "equipment", "reports", "giesen-live", "profile", "profiles", "tab-settings"];
    const inAuthenticatedRoute = inTabsGroup || authenticatedRoutes.includes(segments[0]);

    if (isAuthenticated && !inAuthenticatedRoute) {
      router.replace("/(tabs)");
    } else if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, appReady]);

  if (!appReady) {
    return null;
  }

  return <Slot />;
}
