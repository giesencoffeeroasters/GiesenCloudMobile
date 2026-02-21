import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import {
  DEFAULT_TAB_ORDER,
  VALID_TAB_KEYS,
  type TabKey,
} from "@/constants/tabConfig";

const STORAGE_KEY = "tab_order";
const REQUIRED_COUNT = 5;

interface TabState {
  tabOrder: TabKey[];
  isLoaded: boolean;
  setTabOrder: (order: TabKey[]) => Promise<void>;
  loadTabOrder: () => Promise<void>;
  resetTabOrder: () => Promise<void>;
}

export const useTabStore = create<TabState>((set) => ({
  tabOrder: DEFAULT_TAB_ORDER,
  isLoaded: false,

  setTabOrder: async (order: TabKey[]) => {
    set({ tabOrder: order });
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(order));
  },

  loadTabOrder: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        const valid = parsed.filter((k) => VALID_TAB_KEYS.has(k)) as TabKey[];
        const unique = [...new Set(valid)];
        if (unique.length === REQUIRED_COUNT) {
          set({ tabOrder: unique, isLoaded: true });
          return;
        }
      }
    } catch {
      // Corrupt data — fall through to defaults
    }
    set({ tabOrder: DEFAULT_TAB_ORDER, isLoaded: true });
  },

  resetTabOrder: async () => {
    set({ tabOrder: DEFAULT_TAB_ORDER });
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
}));
