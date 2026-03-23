import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import apiClient, { setOnUnauthorized } from "@/api/client";
import { disconnectPusher } from "@/services/pusher";
import { getExpoPushToken } from "@/utils/pushToken";
import type { AppUser } from "@/types";

export interface LoginResult {
  status: "authenticated" | "two_factor_required";
  challengeId?: string;
  expiresAt?: string;
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorChallenge: (
    challengeId: string,
    options: { code?: string; recoveryCode?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Sync auth state when API client detects a 401
  setOnUnauthorized(() => {
    set({ user: null, isAuthenticated: false });
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, password: string) => {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
        device_name: `${Platform.OS} ${Platform.Version}`,
      });

      if (response.data.requires_two_factor) {
        return {
          status: "two_factor_required",
          challengeId: response.data.challenge_id,
          expiresAt: response.data.expires_at,
        };
      }

      const { token, user } = response.data;
      await SecureStore.setItemAsync("auth_token", token);
      set({ user, isAuthenticated: true });
      return { status: "authenticated" };
    },

    completeTwoFactorChallenge: async (challengeId, options) => {
      const response = await apiClient.post("/auth/two-factor-challenge", {
        challenge_id: challengeId,
        code: options.code,
        recovery_code: options.recoveryCode,
      });

      const { token, user } = response.data;
      await SecureStore.setItemAsync("auth_token", token);
      set({ user, isAuthenticated: true });
    },

    logout: async () => {
      try {
        // Unregister push token before logging out
        try {
          const pushToken = await getExpoPushToken();
          if (pushToken) {
            await apiClient.delete("/device/push-token", {
              data: { token: pushToken },
            });
          }
        } catch {
          // Don't block logout if push token removal fails
        }

        await apiClient.post("/auth/logout");
      } finally {
        disconnectPusher();
        await Notifications.setBadgeCountAsync(0);
        await SecureStore.deleteItemAsync("auth_token");
        set({ user: null, isAuthenticated: false });
      }
    },

    loadUser: async () => {
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        if (!token) {
          set({ isLoading: false });
          return;
        }
        const response = await apiClient.get("/auth/user");
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        if (error.response?.status === 401) {
          await SecureStore.deleteItemAsync("auth_token");
          set({ user: null, isAuthenticated: false, isLoading: false });
        } else {
          // Network/SSL error - keep the token but mark as not loading
          set({ isLoading: false });
        }
      }
    },
  };
});
