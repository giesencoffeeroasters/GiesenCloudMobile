import type { AccessCapabilityKey, AccessFeatureKey } from "@/types";

export type TabKey =
  | "Dashboard"
  | "Roasts"
  | "Planning"
  | "Inventory"
  | "Quality"
  | "Equipment"
  | "Maintenance"
  | "Reports"
  | "GiesenLive";

export interface TabDefinition {
  key: TabKey;
  route: string;
  title: string;
  requiresCapabilities?: AccessCapabilityKey[];
  requiresFeatures?: AccessFeatureKey[];
}

export const ALL_TABS: TabDefinition[] = [
  { key: "Dashboard", route: "index", title: "Dashboard" },
  { key: "Roasts", route: "roasts", title: "Roasts" },
  {
    key: "Planning",
    route: "planning",
    title: "Planning",
    requiresCapabilities: ["roast_planning"],
    requiresFeatures: ["roast_planning"],
  },
  {
    key: "Inventory",
    route: "inventory",
    title: "Inventory",
    requiresCapabilities: ["inventory"],
    requiresFeatures: ["inventory"],
  },
  {
    key: "Quality",
    route: "quality",
    title: "Quality",
    requiresFeatures: ["quality"],
  },
  { key: "Equipment", route: "equipment", title: "Equipment" },
  {
    key: "Maintenance",
    route: "maintenance",
    title: "Maintenance",
    requiresFeatures: ["maintenance"],
  },
  {
    key: "Reports",
    route: "reports",
    title: "Reports",
    requiresFeatures: ["reports"],
  },
  {
    key: "GiesenLive",
    route: "giesen-live",
    title: "Giesen Live",
    requiresCapabilities: ["giesen_live"],
    requiresFeatures: ["giesen_live"],
  },
];

export const DEFAULT_TAB_ORDER: TabKey[] = [
  "Dashboard",
  "Roasts",
  "Planning",
  "Inventory",
  "Quality",
];

export const VALID_TAB_KEYS = new Set<string>(ALL_TABS.map((t) => t.key));
