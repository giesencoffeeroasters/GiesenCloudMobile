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
