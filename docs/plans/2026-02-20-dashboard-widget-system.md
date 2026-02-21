# Dashboard Widget System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fixed dashboard layout with a customizable widget system where users can enable/disable and drag-to-reorder 8 different dashboard widgets.

**Architecture:** Widget registry defines available widgets. Zustand store (persisted to SecureStore) tracks user's widget order and enabled state. Dashboard screen renders a DraggableFlatList of enabled widget components. Edit mode overlays drag handles and toggle switches.

**Tech Stack:** React Native, Expo 54, Zustand 5, expo-secure-store, react-native-draggable-flatlist, react-native-svg, axios

**Parallelization:** Tasks 1-3 are sequential foundation. Tasks 4-11 (8 widget components) are fully independent and should be dispatched to parallel agents. Tasks 12-13 depend on all prior tasks.

---

### Task 1: Install dependency

**Files:**
- Modify: `package.json`

**Step 1: Install react-native-draggable-flatlist**

```bash
cd /Users/daveygiesen/Documents/GitHub/GiesenCloudMobile && bun add react-native-draggable-flatlist react-native-gesture-handler react-native-reanimated
```

Note: `react-native-gesture-handler` and `react-native-reanimated` may already be installed. The command handles deduplication.

**Step 2: Verify installation**

```bash
cd /Users/daveygiesen/Documents/GitHub/GiesenCloudMobile && bun run tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add react-native-draggable-flatlist dependency"
```

---

### Task 2: Create widget registry

**Files:**
- Create: `src/constants/widgets.ts`

**Step 1: Create the widget registry**

```typescript
export interface WidgetDefinition {
  key: string;
  title: string;
  description: string;
  defaultEnabled: boolean;
  defaultOrder: number;
}

export const WIDGETS: WidgetDefinition[] = [
  {
    key: "quick_stats",
    title: "Quick Stats",
    description: "Today's roasts, active roasters, and low stock count",
    defaultEnabled: true,
    defaultOrder: 0,
  },
  {
    key: "todays_schedule",
    title: "Today's Schedule",
    description: "Planned roasts for today with status",
    defaultEnabled: true,
    defaultOrder: 1,
  },
  {
    key: "live_roasters",
    title: "Live Roasters",
    description: "Real-time roaster status with temperatures and progress",
    defaultEnabled: true,
    defaultOrder: 2,
  },
  {
    key: "quick_actions",
    title: "Quick Actions",
    description: "Shortcuts to plan roasts, log quality, and check inventory",
    defaultEnabled: true,
    defaultOrder: 3,
  },
  {
    key: "recent_activity",
    title: "Recent Activity",
    description: "Latest events: completed roasts, stock alerts, deliveries",
    defaultEnabled: true,
    defaultOrder: 4,
  },
  {
    key: "inventory_alerts",
    title: "Inventory Alerts",
    description: "Items with low or critical stock levels",
    defaultEnabled: true,
    defaultOrder: 5,
  },
  {
    key: "production_summary",
    title: "Production Summary",
    description: "Today's production metrics: kg roasted, batches, averages",
    defaultEnabled: true,
    defaultOrder: 6,
  },
  {
    key: "recent_roasts",
    title: "Recent Roasts",
    description: "Last completed roasts with profile and temperature data",
    defaultEnabled: false,
    defaultOrder: 7,
  },
];

export type WidgetKey = (typeof WIDGETS)[number]["key"];

export const WIDGET_MAP = Object.fromEntries(
  WIDGETS.map((w) => [w.key, w])
) as Record<string, WidgetDefinition>;

export const DEFAULT_WIDGET_ORDER = WIDGETS
  .filter((w) => w.defaultEnabled)
  .sort((a, b) => a.defaultOrder - b.defaultOrder)
  .map((w) => w.key);

export const DEFAULT_DISABLED = WIDGETS
  .filter((w) => !w.defaultEnabled)
  .map((w) => w.key);
```

**Step 2: Commit**

```bash
git add src/constants/widgets.ts
git commit -m "feat: add widget registry with 8 dashboard widgets"
```

---

### Task 3: Create widget store

**Files:**
- Create: `src/stores/widgetStore.ts`
- Reference: `src/stores/tabStore.ts` (follow same pattern)

**Step 1: Create the Zustand store**

```typescript
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
      // Fall through to defaults
    } finally {
      set({ isLoaded: true });
    }
  },

  setWidgetOrder: async (order: string[]) => {
    const validated = order.filter((k) => VALID_KEYS.has(k));
    const unique = [...new Set(validated)];
    set({ widgetOrder: unique });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(unique));
    } catch {
      // Silent fail
    }
  },

  toggleWidget: async (key: string) => {
    if (!VALID_KEYS.has(key)) return;

    const { widgetOrder, disabledWidgets } = get();

    if (disabledWidgets.includes(key)) {
      // Enable: remove from disabled, add to end of order
      const newDisabled = disabledWidgets.filter((k) => k !== key);
      const newOrder = [...widgetOrder, key];
      set({ widgetOrder: newOrder, disabledWidgets: newDisabled });
      try {
        await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(newOrder));
        await SecureStore.setItemAsync(STORAGE_KEY_DISABLED, JSON.stringify(newDisabled));
      } catch {
        // Silent fail
      }
    } else {
      // Disable: remove from order, add to disabled
      const newOrder = widgetOrder.filter((k) => k !== key);
      const newDisabled = [...disabledWidgets, key];
      set({ widgetOrder: newOrder, disabledWidgets: newDisabled });
      try {
        await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(newOrder));
        await SecureStore.setItemAsync(STORAGE_KEY_DISABLED, JSON.stringify(newDisabled));
      } catch {
        // Silent fail
      }
    }
  },

  resetToDefault: async () => {
    set({
      widgetOrder: DEFAULT_WIDGET_ORDER,
      disabledWidgets: DEFAULT_DISABLED,
    });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_ORDER, JSON.stringify(DEFAULT_WIDGET_ORDER));
      await SecureStore.setItemAsync(STORAGE_KEY_DISABLED, JSON.stringify(DEFAULT_DISABLED));
    } catch {
      // Silent fail
    }
  },
}));
```

**Step 2: Commit**

```bash
git add src/stores/widgetStore.ts
git commit -m "feat: add widget store with order, toggle, and reset"
```

---

### Task 4: Quick Stats widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/QuickStatsWidget.tsx`

**Context:** Extract the existing stat cards from `app/(tabs)/index.tsx:141-157` into a standalone widget component.

**Step 1: Create the widget**

Reference `app/(tabs)/index.tsx` lines 188-204 for the `StatCard` sub-component and lines 296-336 for the styles. Move them into this new component.

The widget receives `data: DashboardData | null` as a prop. It renders 3 stat cards in a horizontal row:
- Today's Roasts (sky color) - taps to `/(tabs)/planning`
- Active Roasters (leaf color) - taps to `/(tabs)/equipment` (or giesen-live)
- Low Stock (traffic color) - taps to `/(tabs)/inventory`

Wrap each StatCard in a `TouchableOpacity` with `router.push()`.

**Step 2: Commit**

```bash
git add src/components/dashboard/QuickStatsWidget.tsx
git commit -m "feat: add QuickStats dashboard widget"
```

---

### Task 5: Today's Schedule widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/ScheduleWidget.tsx`

**Context:** Extract the schedule section from `app/(tabs)/index.tsx:159-181` into a standalone widget. Include the `ScheduleCard` sub-component (lines 210-234), `formatScheduleTime` (lines 20-27), and `getStatusStyle` (lines 29-56).

The widget receives `data: DashboardData | null`. It renders the section header with "Today's Schedule" and "View All" link, then up to 5 schedule cards. Empty state when no roasts are scheduled.

**Step 2: Commit**

```bash
git add src/components/dashboard/ScheduleWidget.tsx
git commit -m "feat: add TodaysSchedule dashboard widget"
```

---

### Task 6: Live Roasters widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/LiveRoastersWidget.tsx`

**Context:** The `LiveRoaster` type already exists in `src/types/index.ts:39-46` and `DashboardData` already includes `live_roasters`. The HTML mockup at `mobile-mockups/dashboard.html:579-647` shows the target design.

The widget receives `data: DashboardData | null`. For each live roaster, render:
- Machine name and profile name
- Status indicator: pulsing dot + "Roasting" (boven/orange) or "Idle" (textTertiary)
- Stats row: Bean Temp (with degree unit), Duration (mm:ss), RoR (with degree/m unit)
- Active roasters: orange border, progress bar with gradient fill
- Idle roasters: show drum temp, "Pre-heating" status, next scheduled time
- Section header with "Giesen Live" link that navigates to giesen-live tab

Use `Animated` API for the pulsing dot animation.

Colors from `src/constants/colors.ts`: `boven` for active, `textTertiary` for idle.

**Step 2: Commit**

```bash
git add src/components/dashboard/LiveRoastersWidget.tsx
git commit -m "feat: add LiveRoasters dashboard widget"
```

---

### Task 7: Recent Activity widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/RecentActivityWidget.tsx`
- Modify: `src/types/index.ts` (add ActivityItem type if needed)

**Context:** Reference the HTML mockup `mobile-mockups/dashboard.html:650-684` for the design. Each activity item has a colored icon, description text with bold entity name, and relative timestamp.

The widget receives `data: DashboardData | null`. Since the API may not have an activity endpoint yet, design the component to accept an optional `activities` array. If no data, show a placeholder empty state.

Activity item structure:
```typescript
interface ActivityItem {
  id: string;
  type: "roast_completed" | "stock_alert" | "order_received";
  title: string;
  description: string;
  created_at: string;
}
```

Icon colors by type: roast_completed = leaf, order_received = sky, stock_alert = traffic.

Use a helper function for relative time: "32 minutes ago", "1 hour ago", etc.

**Step 2: Commit**

```bash
git add src/components/dashboard/RecentActivityWidget.tsx src/types/index.ts
git commit -m "feat: add RecentActivity dashboard widget"
```

---

### Task 8: Inventory Alerts widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/InventoryAlertsWidget.tsx`

**Context:** Uses the `InventoryItem` type from `src/types/index.ts:80-109`. The `stock_status` field is `"ok" | "low" | "critical"`.

The widget fetches low-stock items from the API (`GET /inventory?stock_status=low,critical` or filter from dashboard data). Each item shows:
- Item name
- Current quantity in kg (convert from grams: `current_quantity_grams / 1000`)
- Threshold in kg
- Status badge: Low (sun/yellow bg) or Critical (traffic/red bg)
- Tapping navigates to `/inventory/[id]`

Section header: "Inventory Alerts" with "View All" link to inventory tab.

**Step 2: Commit**

```bash
git add src/components/dashboard/InventoryAlertsWidget.tsx
git commit -m "feat: add InventoryAlerts dashboard widget"
```

---

### Task 9: Production Summary widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/ProductionSummaryWidget.tsx`

**Context:** A compact metrics card showing today's production. Data comes from dashboard API (may need to extend `DashboardData` type).

Display 3 metrics in a horizontal row (similar to live-stats in mockup):
- **Kg Roasted** - total kg roasted today (JetBrains Mono, large number + "kg" unit)
- **Batches** - total completed batches today
- **Avg Batch** - average batch size in kg

If production data is not yet in the API, compute from `schedule` array where `status === "completed"`.

Card style: single card with border, three stat columns inside.

**Step 2: Commit**

```bash
git add src/components/dashboard/ProductionSummaryWidget.tsx
git commit -m "feat: add ProductionSummary dashboard widget"
```

---

### Task 10: Quick Actions widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/QuickActionsWidget.tsx`

**Context:** Horizontal row of 3 shortcut buttons. Each button is a rounded rectangle with an icon and label.

Actions:
1. **Plan Roast** - icon: calendar + plus, navigates to `/planning/create`
2. **Log Quality** - icon: star, navigates to `/quality/create`
3. **Check Stock** - icon: package/box, navigates to `/(tabs)/inventory`

Style: Each button is a `TouchableOpacity` with `Colors.card` background, `Colors.border` border, rounded corners. Icon in `Colors.sky` color, label in `Colors.text`. Buttons are equal width in a flex row with gap.

No section header needed - the buttons speak for themselves.

**Step 2: Commit**

```bash
git add src/components/dashboard/QuickActionsWidget.tsx
git commit -m "feat: add QuickActions dashboard widget"
```

---

### Task 11: Recent Roasts widget (PARALLELIZABLE)

**Files:**
- Create: `src/components/dashboard/RecentRoastsWidget.tsx`

**Context:** Uses the `ProfilerRoast` type from `src/types/index.ts:239-250`.

The widget fetches recent roasts from the API (`GET /profiler/roasts?limit=5&sort=-roasted_at`). Each item shows:
- Profile name (bold)
- Device name + batch size (secondary text)
- Duration formatted as mm:ss
- End bean temp with degree unit
- Tapping navigates to `/roasts/[id]`

Section header: "Recent Roasts" with "View All" link to roasts tab.

This widget is **default OFF** - users must enable it in edit mode.

**Step 2: Commit**

```bash
git add src/components/dashboard/RecentRoastsWidget.tsx
git commit -m "feat: add RecentRoasts dashboard widget"
```

---

### Task 12: Rewrite dashboard screen with widget system

**Files:**
- Modify: `app/(tabs)/index.tsx` (complete rewrite)

**Context:** Replace the entire dashboard screen. The new screen:

1. **Header:** Same dark slate header with logo, "Dashboard" title, team name. Add a pencil/edit icon button next to the bell icon. When in edit mode, header shows "Edit Dashboard" with a "Done" button.

2. **Normal mode:** Render a `FlatList` with pull-to-refresh. Map over `widgetStore.widgetOrder` and render the corresponding widget component for each key. Pass dashboard data to each widget.

3. **Data fetching:** Keep the existing `GET /dashboard` fetch. Pass the `DashboardData` to all widgets via props.

4. **Widget component map:** A `Record<string, React.ComponentType<WidgetProps>>` mapping keys to widget components:
```typescript
const WIDGET_COMPONENTS: Record<string, React.ComponentType<{ data: DashboardData | null }>> = {
  quick_stats: QuickStatsWidget,
  todays_schedule: ScheduleWidget,
  live_roasters: LiveRoastersWidget,
  quick_actions: QuickActionsWidget,
  recent_activity: RecentActivityWidget,
  inventory_alerts: InventoryAlertsWidget,
  production_summary: ProductionSummaryWidget,
  recent_roasts: RecentRoastsWidget,
};
```

5. **Load widget store** in useEffect (same pattern as tabStore loading).

**Step 2: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: rewrite dashboard with widget system"
```

---

### Task 13: Add edit mode UI

**Files:**
- Modify: `app/(tabs)/index.tsx` (add edit mode state and rendering)

**Context:** When `isEditMode` is true, replace the FlatList with a `DraggableFlatList` from `react-native-draggable-flatlist`.

**Edit mode rendering for each enabled widget:**
- Drag handle (6-dot grip icon) on the left
- Widget title + description in the center
- Toggle switch (Switch component) on the right
- No actual widget content shown

**Below enabled widgets, a "Available Widgets" section:**
- Header text "Available Widgets"
- List of disabled widgets with "+" button to enable
- Each shows title + description, greyed out

**Bottom of edit mode:**
- "Reset to Default" button (text button, `Colors.traffic` color)

**DraggableFlatList onDragEnd:**
- Call `widgetStore.setWidgetOrder(newOrder)` with the reordered keys

**Header changes in edit mode:**
- Title changes to "Edit Dashboard"
- Bell icon replaced by "Done" text button
- Pencil icon hidden

Reference `app/tab-settings.tsx` for the existing drag-reorder UX pattern with manual up/down buttons. This task upgrades to true drag-and-drop.

**Step 2: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: add dashboard edit mode with drag reorder and toggles"
```

---

## Parallelization Strategy

```
Sequential:  Task 1 → Task 2 → Task 3
                                  ↓
Parallel:    Task 4 | Task 5 | Task 6 | Task 7 | Task 8 | Task 9 | Task 10 | Task 11
                                  ↓
Sequential:  Task 12 → Task 13
```

**Agent assignments for parallel phase:**
- Agent A: Tasks 4 + 5 (Quick Stats + Schedule - extracted from existing code)
- Agent B: Tasks 6 + 7 (Live Roasters + Recent Activity - new components from mockup)
- Agent C: Tasks 8 + 9 (Inventory Alerts + Production Summary - data-focused widgets)
- Agent D: Tasks 10 + 11 (Quick Actions + Recent Roasts - navigation and listing widgets)

Each agent works independently since all widgets follow the same interface: `{ data: DashboardData | null }` props.
