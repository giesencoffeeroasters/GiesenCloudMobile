import type { ActivityItem, ActivityType } from "@/types";

type Translate = (
  key: string,
  options?: { defaultValue?: string },
) => string;

const ACTIVITY_TITLE_KEYS: Record<ActivityType, string> = {
  roast_completed: "widgets.activityTitles.roastCompleted",
  inventory_received: "widgets.activityTitles.inventoryReceived",
  inventory_used: "widgets.activityTitles.inventoryUsed",
  inventory_adjusted: "widgets.activityTitles.inventoryAdjusted",
  stock_alert: "widgets.activityTitles.stockAlert",
};

export function getActivityTitleKey(type: ActivityType): string {
  return ACTIVITY_TITLE_KEYS[type];
}

export function getActivityTitle(
  activity: ActivityItem,
  t: Translate,
): string {
  return t(getActivityTitleKey(activity.type), {
    defaultValue: activity.title,
  });
}
