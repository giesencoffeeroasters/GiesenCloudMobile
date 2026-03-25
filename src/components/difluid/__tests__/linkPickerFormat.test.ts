import { describe, expect, it } from "@jest/globals";

import {
  formatLinkPickerMeta,
  formatLinkPickerSecondary,
  getLinkPickerScoreBadge,
  getLinkPickerStats,
  getLinkPickerTitle,
} from "../linkPickerFormat";

describe("linkPickerFormat", () => {
  const roast = {
    id: "roast-123",
    name: "Colombia Filter",
    profile_name: "House Filter",
    bean_type: "Arabica",
    device_name: "W15A",
    start_weight: 1200,
    duration: 510,
    weight_change: 14.2,
    roasted_at: "2026-03-25T10:30:00Z",
    cupping_score: 87.4,
  };

  it("prefers the roast name as the picker title", () => {
    expect(getLinkPickerTitle(roast)).toBe("Colombia Filter");
  });

  it("shows roast device and batch weight in the primary meta line", () => {
    expect(formatLinkPickerMeta(roast)).toBe("W15A • 1.2 kg • 25 Mar, 11:30");
  });

  it("shows roast timing and quality details in the secondary meta line", () => {
    expect(formatLinkPickerSecondary(roast)).toContain("Arabica");
    expect(formatLinkPickerSecondary(roast)).toContain("House Filter");
    expect(formatLinkPickerSecondary(roast)).toContain("25 Mar 2026");
  });

  it("surfaces the cupping score as a separate badge value", () => {
    expect(getLinkPickerScoreBadge(roast)).toBe("87.4");
  });

  it("returns structured roast stats for the picker card", () => {
    expect(getLinkPickerStats(roast)).toEqual([
      { label: "Weight", value: "1.2 kg" },
      { label: "Duration", value: "8:30" },
      { label: "Loss", value: "14.2%" },
    ]);
  });
});
