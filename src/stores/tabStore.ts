import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import {
  ALL_TABS,
  DEFAULT_TAB_ORDER,
  VALID_TAB_KEYS,
  type TabKey,
} from "@/constants/tabConfig";

const STORAGE_KEY = "tab_order";
const MAX_VISIBLE_TABS = 5;

export function buildDefaultTabOrder(
  allowedTabKeys: readonly TabKey[] = ALL_TABS.map((tab) => tab.key) as TabKey[],
): TabKey[] {
  const allowedSet = new Set(
    allowedTabKeys.filter((key): key is TabKey => VALID_TAB_KEYS.has(key)),
  );

  if (allowedSet.size === 0) {
    return [];
  }

  const next: TabKey[] = [];
  const seen = new Set<TabKey>();

  const fallbackOrder = [
    ...DEFAULT_TAB_ORDER,
    ...allowedTabKeys.filter((key) => !DEFAULT_TAB_ORDER.includes(key)),
  ];

  for (const key of fallbackOrder) {
    if (!allowedSet.has(key) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(key);

    if (next.length >= MAX_VISIBLE_TABS) {
      break;
    }
  }

  return next;
}

export function reconcileTabOrder(
  order: readonly TabKey[],
  allowedTabKeys: readonly TabKey[] = ALL_TABS.map((tab) => tab.key) as TabKey[],
): TabKey[] {
  const allowedSet = new Set(
    allowedTabKeys.filter((key): key is TabKey => VALID_TAB_KEYS.has(key)),
  );

  if (allowedSet.size === 0) {
    return [];
  }

  const next: TabKey[] = [];
  const seen = new Set<TabKey>();

  for (const key of order) {
    if (!VALID_TAB_KEYS.has(key) || !allowedSet.has(key) || seen.has(key)) {
      continue;
    }

    const tabKey = key as TabKey;
    seen.add(tabKey);
    next.push(tabKey);

    if (next.length >= MAX_VISIBLE_TABS) {
      return next;
    }
  }

  if (next.length > 0) {
    return next;
  }

  return buildDefaultTabOrder(allowedTabKeys);
}

interface TabState {
  tabOrder: TabKey[];
  isLoaded: boolean;
  setTabOrder: (order: TabKey[]) => Promise<void>;
  loadTabOrder: (allowedTabKeys?: readonly TabKey[]) => Promise<void>;
  resetTabOrder: (allowedTabKeys?: readonly TabKey[]) => Promise<void>;
}

export const useTabStore = create<TabState>((set) => ({
  tabOrder: DEFAULT_TAB_ORDER,
  isLoaded: false,

  setTabOrder: async (order: TabKey[]) => {
    const sanitized = [...new Set(order.filter((key) => VALID_TAB_KEYS.has(key)))] as TabKey[];
    set({ tabOrder: sanitized });
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(sanitized));
  },

  loadTabOrder: async (allowedTabKeys = ALL_TABS.map((tab) => tab.key) as TabKey[]) => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        const valid = parsed.filter((k) => VALID_TAB_KEYS.has(k)) as TabKey[];
        const unique = [...new Set(valid)];
        set({
          tabOrder: reconcileTabOrder(unique, allowedTabKeys),
          isLoaded: true,
        });
        return;
      }
    } catch {
      // Corrupt data — fall through to defaults
    }
    set({
      tabOrder: buildDefaultTabOrder(allowedTabKeys),
      isLoaded: true,
    });
  },

  resetTabOrder: async (allowedTabKeys = ALL_TABS.map((tab) => tab.key) as TabKey[]) => {
    set({ tabOrder: buildDefaultTabOrder(allowedTabKeys) });
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
}));
