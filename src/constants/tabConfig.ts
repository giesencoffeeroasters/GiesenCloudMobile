export type TabKey =
  | "Dashboard"
  | "Roasts"
  | "Planning"
  | "Inventory"
  | "Quality"
  | "Equipment"
  | "Reports"
  | "GiesenLive";

export interface TabDefinition {
  key: TabKey;
  route: string;
  title: string;
}

export const ALL_TABS: TabDefinition[] = [
  { key: "Dashboard", route: "index", title: "Dashboard" },
  { key: "Roasts", route: "roasts", title: "Roasts" },
  { key: "Planning", route: "planning", title: "Planning" },
  { key: "Inventory", route: "inventory", title: "Inventory" },
  { key: "Quality", route: "quality", title: "Quality" },
  { key: "Equipment", route: "equipment", title: "Equipment" },
  { key: "Reports", route: "reports", title: "Reports" },
  { key: "GiesenLive", route: "giesen-live", title: "Giesen Live" },
];

export const DEFAULT_TAB_ORDER: TabKey[] = [
  "Dashboard",
  "Roasts",
  "Planning",
  "Inventory",
  "Quality",
];

export const VALID_TAB_KEYS = new Set<string>(ALL_TABS.map((t) => t.key));
