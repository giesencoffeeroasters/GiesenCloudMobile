# Dashboard Widget System Design

**Date:** 2026-02-20
**Status:** Approved

## Overview

Redesign the GiesenCloud Mobile dashboard from a fixed layout to a customizable widget system. Users can enable/disable widgets and reorder them via drag-and-drop. Configuration persists across sessions.

## Architecture

### Widget Registry (`src/constants/widgets.ts`)

Central definition of all available widgets:

- `key` - unique string ID (e.g. `"quick_stats"`, `"live_roasters"`)
- `title` - display name
- `description` - short description shown in edit mode
- `defaultEnabled` - whether the widget is on for new users
- `component` - reference to the React component

### Widget Store (`src/stores/widgetStore.ts`)

Zustand store persisted to AsyncStorage:

- `widgetOrder: string[]` - ordered list of enabled widget keys
- `disabledWidgets: string[]` - explicitly disabled widgets
- `reorder(from, to)` - move widget position
- `toggleWidget(key)` - enable/disable a widget
- `resetToDefault()` - restore factory defaults

Follows the existing pattern of `useTabStore` and `useAuthStore`.

### Dashboard Screen

Renders a `FlatList` of enabled widgets in the configured order. Each widget is a self-contained component. Data is fetched once via the existing `/dashboard` endpoint and passed to widgets, with widget-specific endpoints for data not covered by the main fetch.

## Widgets

### 1. Quick Stats (default: ON)

Three compact stat cards in a horizontal row: Today's Roasts, Active Roasters, Low Stock Items. Each card has a colored top stripe. Tapping a card navigates to its related section.

### 2. Today's Schedule (default: ON)

List of today's planned roasts showing time, profile name, device, batch size, and status badge (Planned / In Progress / Completed). "View All" links to Planning tab. Max 5 items.

### 3. Live Roasters (default: ON)

Real-time roaster cards with machine name, profile, bean temp, duration, RoR, and progress bar. Active roasters get an orange border and pulsing "Roasting" indicator. Idle machines show drum temp and next scheduled roast. Tapping goes to Giesen Live.

### 4. Recent Activity (default: ON)

Chronological feed of recent events: completed roasts, stock alerts, received orders. Colored icon, description text, and relative timestamp. Max 5 items, newest first.

### 5. Inventory Alerts (default: ON)

Items with low or critical stock. Shows item name, current quantity, threshold, and severity badge (Low = yellow, Critical = red). Tapping navigates to inventory item detail.

### 6. Production Summary (default: ON)

Key metrics: kg roasted today, total batches, avg batch size. Compact card layout.

### 7. Quick Actions (default: ON)

Horizontal row of shortcut buttons: "Plan Roast", "Log Quality", "Check Inventory". Small icon + label, navigates directly to create/action screens.

### 8. Recent Roasts (default: OFF)

Last 5 completed roasts with profile name, device, duration, end bean temp. Default OFF since Today's Schedule covers active roasts.

## Edit Mode

Triggered by a pencil icon in the dashboard header:

1. Header changes to "Edit Dashboard" with a "Done" button
2. Each enabled widget shows: drag handle (left), title + description (center), toggle switch (right)
3. Disabled widgets appear in a "Available Widgets" section at the bottom with "+" buttons
4. Drag to reorder enabled widgets
5. "Done" exits edit mode, saves to AsyncStorage
6. "Reset to Default" option at the bottom

## Data Flow

- Main dashboard data: single `GET /dashboard` call (already exists, returns `DashboardData`)
- Activity feed: `GET /dashboard/activity` (new endpoint, or use notifications)
- Production summary: `GET /dashboard/production` (new endpoint, or compute from roasts)
- All other data covered by existing `DashboardData` type

## Default Widget Order

1. Quick Stats
2. Today's Schedule
3. Live Roasters
4. Quick Actions
5. Recent Activity
6. Inventory Alerts
7. Production Summary

## Implementation Notes

- Use `react-native-draggable-flatlist` for drag-and-drop reordering
- Each widget component follows naming convention: `Dashboard{Name}Widget.tsx`
- Widget components live in `src/components/dashboard/`
- Edit mode is a state toggle on the dashboard screen, not a separate screen
- Follows existing design system: Colors, DM Sans / JetBrains Mono fonts, card borders, spacing
