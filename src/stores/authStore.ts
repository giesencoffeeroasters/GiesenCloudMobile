import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import apiClient from "@/api/client";

interface User {
  id: number;
  name: string;
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
    const response = await apiClient.post("/auth/login", { email, password });
    const { token, user } = response.data.data;
    await SecureStore.setItemAsync("auth_token", token);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
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
      set({ user: response.data.data, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync("auth_token");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
