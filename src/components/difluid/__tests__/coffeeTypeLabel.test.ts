import { describe, expect, it } from "@jest/globals";

import { formatCoffeeTypeLabel } from "../coffeeTypeLabel";

describe("formatCoffeeTypeLabel", () => {
  it("formats known DiFluid coffee types for display", () => {
    expect(formatCoffeeTypeLabel("roasted")).toBe("Roasted");
    expect(formatCoffeeTypeLabel("auto")).toBe("Auto");
  });

  it("falls back safely when the API returns a non-string coffee type", () => {
    expect(formatCoffeeTypeLabel(1)).toBe("Unknown");
    expect(formatCoffeeTypeLabel(null)).toBe("Unknown");
  });
});
