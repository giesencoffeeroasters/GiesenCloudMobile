import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import {
  WIDGETS,
  DEFAULT_WIDGET_ORDER,
  DEFAULT_DISABLED,
} from "@/constants/widgets";

const STORAGE_KEY_ORDER = "widget_order";
const STORAGE_KEY_DISABLED = "widget_disabled";

const VALID_KEYS = new Set(WIDGETS.map((w) => w.key));

interface WidgetState {
  widgetOrder: string[];
  disabledWidgets: string[];
  isLoaded: boolean;
  loadWidgets: () => Promise<void>;
  setWidgetOrder: (order: string[]) => Promise<void>;
  toggleWidget: (key: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  widgetOrder: DEFAULT_WIDGET_ORDER,
  disabledWidgets: DEFAULT_DISABLED,
  isLoaded: false,

  loadWidgets: async () => {
    try {
      const storedOrder = await SecureStore.getItemAsync(STORAGE_KEY_ORDER);
      const storedDisabled = await SecureStore.getItemAsync(STORAGE_KEY_DISABLED);

      if (storedOrder) {
        const parsed: string[] = JSON.parse(storedOrder);
        const validated = parsed.filter((k) => VALID_KEYS.has(k));
        const unique = [...new Set(validated)];
        if (unique.length > 0) {
          set({ widgetOrder: unique });
        }
      }

      if (storedDisabled) {
        const parsed: string[] = JSON.parse(storedDisabled);
        const validated = parsed.filter((k) => VALID_KEYS.has(k));
        set({ disabledWidgets: [...new Set(validated)] });
      }
    } catch {
      // Corrupt data — fall through to defaults
    }
    set({ isLoaded: true });
  },

  setWidgetOrder: async (order: string[]) => {
    const validated = order.filter((k) => VALID_KEYS.has(k));
    const unique = [...new Set(validated)];
    set({ widgetOrder: unique });
    await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(unique));
  },

  toggleWidget: async (key: string) => {
    if (!VALID_KEYS.has(key)) return;

    const { widgetOrder, disabledWidgets } = get();

    if (disabledWidgets.includes(key)) {
      const newDisabled = disabledWidgets.filter((k) => k !== key);
      const newOrder = [...widgetOrder, key];
      set({ widgetOrder: newOrder, disabledWidgets: newDisabled });
      await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(newOrder));
      await SecureStore.setItemAsync(STORAGE_KEY_DISABLED, JSON.stringify(newDisabled));
    } else {
      const newOrder = widgetOrder.filter((k) => k !== key);
      const newDisabled = [...disabledWidgets, key];
      set({ widgetOrder: newOrder, disabledWidgets: newDisabled });
      await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(newOrder));
      await SecureStore.setItemAsync(STORAGE_KEY_DISABLED, JSON.stringify(newDisabled));
    }
  },

  resetToDefault: async () => {
    set({
      widgetOrder: DEFAULT_WIDGET_ORDER,
      disabledWidgets: DEFAULT_DISABLED,
    });
    await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(DEFAULT_WIDGET_ORDER));
    await SecureStore.setItemAsync(STORAGE_KEY_DISABLED, JSON.stringify(DEFAULT_DISABLED));
  },
}));
