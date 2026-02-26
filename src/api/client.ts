import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "@/constants/config";

const apiClient = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  // Dynamic base URL — allows runtime server switching
  config.baseURL = getApiBaseUrl();

  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!config.url?.includes("/auth/login")) {
    // Reject non-login requests when there's no token to prevent 401 cascades
    return Promise.reject(new axios.Cancel("No auth token"));
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("auth_token");
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
