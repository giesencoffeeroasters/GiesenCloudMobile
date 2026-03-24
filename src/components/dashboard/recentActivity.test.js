import { describe, expect, it } from "bun:test";
import {
  getActivityTitle,
  getActivityTitleKey,
} from "./recentActivity";

describe("recentActivity helpers", () => {
  it("maps activity types to stable translation keys", () => {
    expect(getActivityTitleKey("roast_completed")).toBe(
      "widgets.activityTitles.roastCompleted",
    );
    expect(getActivityTitleKey("inventory_used")).toBe(
      "widgets.activityTitles.inventoryUsed",
    );
  });

  it("uses translated titles when available", () => {
    const activity = {
      id: "roast_1",
      type: "roast_completed",
      title: "Roast completed",
      description: "Batch 42 on W15",
      created_at: "2026-03-23T10:00:00Z",
    };

    const t = (key, options) =>
      key === "widgets.activityTitles.roastCompleted"
        ? "Branding voltooid"
        : options?.defaultValue ?? key;

    expect(getActivityTitle(activity, t)).toBe("Branding voltooid");
  });

  it("falls back to the API title when no translation exists", () => {
    const activity = {
      id: "txn_1",
      type: "inventory_adjusted",
      title: "Stock corrected",
      description: "Colombia Supremo",
      created_at: "2026-03-23T10:00:00Z",
    };

    const t = (_key, options) => options?.defaultValue;

    expect(getActivityTitle(activity, t)).toBe("Stock corrected");
  });
});
