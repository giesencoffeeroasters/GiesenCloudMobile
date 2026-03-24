import type {
  AccessCapabilityKey,
  AccessContext,
  AccessFeatureKey,
  AppUser,
} from "@/types";
import { hasRequiredAccess } from "@/lib/featureAccess";

export interface WidgetDefinition {
  key: string;
  titleKey: string;
  descriptionKey: string;
  defaultEnabled: boolean;
  defaultOrder: number;
  requiresCapabilities?: AccessCapabilityKey[];
  requiresFeatures?: AccessFeatureKey[];
}

type WidgetAccessSubject = AccessContext | AppUser | null | undefined;

export const WIDGETS: WidgetDefinition[] = [
  {
    key: "quick_stats",
    titleKey: "widgets.quickStats",
    descriptionKey: "widgets.quickStatsDesc",
    defaultEnabled: true,
    defaultOrder: 0,
  },
  {
    key: "todays_schedule",
    titleKey: "widgets.schedule",
    descriptionKey: "widgets.scheduleDesc",
    defaultEnabled: true,
    defaultOrder: 1,
    requiresCapabilities: ["roast_planning"],
    requiresFeatures: ["roast_planning"],
  },
  {
    key: "live_roasters",
    titleKey: "widgets.liveRoasters",
    descriptionKey: "widgets.liveRoastersDesc",
    defaultEnabled: true,
    defaultOrder: 2,
    requiresCapabilities: ["giesen_live"],
    requiresFeatures: ["giesen_live"],
  },
  {
    key: "quick_actions",
    titleKey: "widgets.quickActions",
    descriptionKey: "widgets.quickActionsDesc",
    defaultEnabled: true,
    defaultOrder: 3,
  },
  {
    key: "recent_activity",
    titleKey: "widgets.recentActivity",
    descriptionKey: "widgets.recentActivityDesc",
    defaultEnabled: true,
    defaultOrder: 4,
  },
  {
    key: "inventory_alerts",
    titleKey: "widgets.inventoryAlerts",
    descriptionKey: "widgets.inventoryAlertsDesc",
    defaultEnabled: true,
    defaultOrder: 5,
    requiresCapabilities: ["inventory"],
    requiresFeatures: ["inventory"],
  },
  {
    key: "production_summary",
    titleKey: "widgets.productionSummary",
    descriptionKey: "widgets.productionSummaryDesc",
    defaultEnabled: true,
    defaultOrder: 6,
    requiresFeatures: ["reports"],
  },
  {
    key: "recent_roasts",
    titleKey: "widgets.recentRoasts",
    descriptionKey: "widgets.recentRoastsDesc",
    defaultEnabled: false,
    defaultOrder: 7,
  },
  {
    key: "maintenance_overview",
    titleKey: "widgets.maintenanceOverview",
    descriptionKey: "widgets.maintenanceDesc",
    defaultEnabled: false,
    defaultOrder: 8,
    requiresFeatures: ["maintenance"],
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

function hasWidgetAccess(
  subject: WidgetAccessSubject,
  widget: WidgetDefinition,
): boolean {
  if (widget.key === "quick_stats") {
    return (
      hasRequiredAccess(subject, {
        requiresCapabilities: ["roast_planning"],
        requiresFeatures: ["roast_planning"],
      }) ||
      hasRequiredAccess(subject, {
        requiresCapabilities: ["giesen_live"],
        requiresFeatures: ["giesen_live"],
      }) ||
      hasRequiredAccess(subject, {
        requiresCapabilities: ["inventory"],
        requiresFeatures: ["inventory"],
      })
    );
  }

  if (widget.key === "quick_actions") {
    return (
      hasRequiredAccess(subject, {
        requiresCapabilities: ["roast_planning"],
        requiresFeatures: ["roast_planning"],
      }) ||
      hasRequiredAccess(subject, {
        requiresFeatures: ["quality"],
      }) ||
      hasRequiredAccess(subject, {
        requiresCapabilities: ["inventory"],
        requiresFeatures: ["inventory"],
      })
    );
  }

  return hasRequiredAccess(subject, widget);
}

export function getVisibleWidgets(
  subject: WidgetAccessSubject,
): WidgetDefinition[] {
  return WIDGETS.filter((widget) => hasWidgetAccess(subject, widget));
}

export function getVisibleWidgetKeys(
  subject: WidgetAccessSubject,
): WidgetKey[] {
  return getVisibleWidgets(subject).map((widget) => widget.key as WidgetKey);
}
