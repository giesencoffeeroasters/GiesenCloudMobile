import { describe, expect, it } from "@jest/globals";

import {
  canAccessFeature,
  getSelectableDevicesFor,
  getVisibleTabs,
  type AccessAwareTabDefinition,
} from "../featureAccess";
import { ALL_TABS } from "@/constants/tabConfig";
import type { AccessContext, AppUser } from "@/types";

describe("featureAccess", () => {
  it("hides the inventory tab when the inventory capability is false", () => {
    const accessContext: AccessContext = {
      plan: {
        plan_slug: "essential",
        plan_label: "Essential",
        legacy_plan_name: "profiler-basic",
      },
      capabilities: {
        profiler: true,
        roast_planning: false,
        giesen_live: false,
        inventory: false,
        quality: false,
        reports: false,
      },
      features: {
        maintenance: true,
      },
      enabled_feature_keys: ["maintenance"],
      devices: [],
    };

    const tabs: AccessAwareTabDefinition[] = [
      { key: "Dashboard", title: "Dashboard" },
      {
        key: "Inventory",
        title: "Inventory",
        requiresCapabilities: ["inventory"],
      },
    ];

    expect(getVisibleTabs(accessContext, tabs).map((tab) => tab.key)).toEqual([
      "Dashboard",
    ]);
  });

  it("only returns devices with roast_planning access for the planning selector", () => {
    const devices = [
      {
        id: "device-1",
        name: "Alpha",
        capabilities: {
          roast_planning: true,
          inventory: false,
        },
      },
      {
        id: "device-2",
        name: "Beta",
        subscriptions: {
          roast_planning: true,
          inventory: false,
        },
      },
      {
        id: "device-3",
        name: "Gamma",
        capabilities: {
          roast_planning: false,
          inventory: true,
        },
      },
    ];

    expect(getSelectableDevicesFor("planning", devices).map((device) => device.id)).toEqual([
      "device-1",
      "device-2",
    ]);
  });

  it("reads feature visibility from feature flags on the user access context", () => {
    const user: AppUser = {
      id: 1,
      name: "Ava",
      email: "ava@example.com",
      current_team: {
        id: 10,
        name: "Team One",
      },
      access_context: {
        plan: {
          plan_slug: "essential",
          plan_label: "Essential",
          legacy_plan_name: "profiler-basic",
        },
        capabilities: {
          profiler: true,
          roast_planning: false,
          giesen_live: false,
          inventory: false,
          quality: false,
          reports: false,
        },
        features: {
          maintenance: true,
        },
        enabled_feature_keys: ["maintenance"],
        devices: [],
      },
    };

    expect(canAccessFeature(user, "maintenance")).toBe(true);
    expect(canAccessFeature(user, "reports")).toBe(false);
  });

  it("keeps only the tabs that match the minimal essential-like access context", () => {
    const user: AppUser = {
      id: 1,
      name: "Ava",
      email: "ava@example.com",
      current_team: {
        id: 10,
        name: "Team One",
      },
      access_context: {
        plan: {
          plan_slug: "essential",
          plan_label: "Essential",
          legacy_plan_name: "profiler-basic",
        },
        capabilities: {
          profiler: true,
          roast_planning: false,
          giesen_live: false,
          inventory: false,
          quality: false,
          reports: false,
        },
        features: {
          maintenance: true,
        },
        enabled_feature_keys: ["maintenance"],
        devices: [],
      },
    };

    const tabs: AccessAwareTabDefinition[] = [
      { key: "Dashboard", title: "Dashboard" },
      { key: "Roasts", title: "Roasts" },
      {
        key: "Planning",
        title: "Planning",
        requiresCapabilities: ["roast_planning"],
      },
      {
        key: "Inventory",
        title: "Inventory",
        requiresCapabilities: ["inventory"],
      },
      {
        key: "Maintenance",
        title: "Maintenance",
        requiresFeatures: ["maintenance"],
      },
    ];

    expect(getVisibleTabs(user, tabs).map((tab) => tab.key)).toEqual([
      "Dashboard",
      "Roasts",
      "Maintenance",
    ]);
  });

  it("uses feature scopes for quality and reports, and feature plus capability for planning, inventory, and live", () => {
    const user: AppUser = {
      id: 1,
      name: "Ava",
      email: "ava@example.com",
      current_team: {
        id: 10,
        name: "Team One",
      },
      access_context: {
        plan: {
          plan_slug: "industrial",
          plan_label: "Industrial",
          legacy_plan_name: "profiler-industrial",
        },
        capabilities: {
          profiler: true,
          roast_planning: true,
          giesen_live: true,
          inventory: true,
          quality: false,
          reports: false,
        },
        features: {
          quality: true,
          reports: true,
          roast_planning: false,
          inventory: false,
          giesen_live: false,
        },
        enabled_feature_keys: ["quality", "reports"],
        devices: [],
      },
    };

    expect(getVisibleTabs(user, ALL_TABS).map((tab) => tab.key)).toEqual([
      "Dashboard",
      "Roasts",
      "Quality",
      "Equipment",
      "Reports",
    ]);
  });
});
