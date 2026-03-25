import { describe, expect, it } from "@jest/globals";

import {
  formatLinkPickerMeta,
  formatLinkPickerSecondary,
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
    expect(formatLinkPickerMeta(roast)).toBe("W15A • 1.2 kg");
  });

  it("shows roast timing and quality details in the secondary meta line", () => {
    expect(formatLinkPickerSecondary(roast)).toContain("Arabica");
    expect(formatLinkPickerSecondary(roast)).toContain("8:30");
    expect(formatLinkPickerSecondary(roast)).toContain("14.2% loss");
    expect(formatLinkPickerSecondary(roast)).toContain("87.4 pts");
  });
});
