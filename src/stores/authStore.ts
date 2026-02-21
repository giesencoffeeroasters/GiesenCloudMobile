import { Platform } from "react-native";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import apiClient from "@/api/client";
import { disconnectPusher } from "@/services/pusher";

interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  current_team: {
    id: number;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", {
      email,
      password,
      device_name: `${Platform.OS} ${Platform.Version}`,
    });
    const { token, user } = response.data;
    await SecureStore.setItemAsync("auth_token", token);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      disconnectPusher();
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
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
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
}));
