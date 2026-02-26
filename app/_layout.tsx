import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  LogBox,
} from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/authStore";
import { useGiesenLive } from "@/hooks/useGiesenLive";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { initActiveServer } from "@/constants/config";

// Suppress Expo Go push notification warnings (not applicable in dev builds)
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported",
]);

SplashScreen.preventAutoHideAsync();

function BrandedSplash() {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const spinnerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(spinnerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={splashStyles.container}>
      <View style={splashStyles.content}>
        <Animated.View
          style={[
            splashStyles.logoWrap,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image
            source={require("../assets/icon.png")}
            style={splashStyles.logoImage}
          />
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={splashStyles.title}>GiesenCloud</Text>
          <Text style={splashStyles.subtitle}>Coffee Roasting Platform</Text>
        </Animated.View>
      </View>

      <Animated.View style={[splashStyles.footer, { opacity: spinnerOpacity }]}>
        <ActivityIndicator size="small" color="rgba(56,56,56,0.3)" />
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 24,
  },
  logoWrap: {
    alignItems: "center",
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#383838",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(56,56,56,0.45)",
    textAlign: "center",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 80,
  },
});

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [splashDone, setSplashDone] = useState(false);

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
    initActiveServer().then(() => loadUser());
  }, []);

  // Keep WebSocket connection alive for Giesen Live data across all screens
  useGiesenLive();

  // Register for push notifications when authenticated
  usePushNotifications();

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync();
      setAppReady(true);
      // Fade out the branded splash overlay
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }).start(() => setSplashDone(true));
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

  return (
    <View style={{ flex: 1 }}>
      {appReady && (
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
      )}
      {!splashDone && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: fadeOut, zIndex: 10 }]}
          pointerEvents={appReady ? "none" : "auto"}
        >
          <BrandedSplash />
        </Animated.View>
      )}
    </View>
  );
}
