import { describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-secure-store", () => ({
  __esModule: true,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => null),
}));

import {
  buildDefaultTabOrder,
  reconcileTabOrder,
} from "../tabStore";
import type { TabKey } from "@/constants/tabConfig";

describe("tabStore helpers", () => {
  it("keeps explicitly removed tabs hidden when reconciling a saved order", () => {
    const savedOrder: TabKey[] = ["Dashboard", "Roasts"];
    const allowedTabs: TabKey[] = ["Dashboard", "Roasts", "Equipment"];

    expect(reconcileTabOrder(savedOrder, allowedTabs)).toEqual([
      "Dashboard",
      "Roasts",
    ]);
  });

  it("builds a default visible order from allowed tabs when defaults are unavailable", () => {
    const allowedTabs: TabKey[] = ["Dashboard", "Roasts", "Equipment"];

    expect(buildDefaultTabOrder(allowedTabs)).toEqual([
      "Dashboard",
      "Roasts",
      "Equipment",
    ]);
  });
});
