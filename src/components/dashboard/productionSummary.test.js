import { describe, expect, it } from "bun:test";
import { getProductionSummaryMetrics } from "./productionSummary";

describe("getProductionSummaryMetrics", () => {
  it("uses explicit production summary data instead of schedule items", () => {
    const data = {
      today_roasts: 2,
      active_roasters: 1,
      low_stock_count: 0,
      inventory_alerts: [],
      schedule: [
        {
          id: 1,
          order: 1,
          scheduled_at: "2026-03-23T08:00:00Z",
          profile: { id: 1, name: "Espresso" },
          device: { id: 1, name: "W15A" },
          green_coffee: "Brazil",
          batch_size: 12,
          status: "pending",
        },
      ],
      live_roasters: [],
      recent_activity: [],
      production_summary: {
        total_roasts: 4,
        total_weight_kg: 80,
        avg_duration: 540,
        daily_breakdown: [],
        top_profiles: [],
      },
    };

    expect(getProductionSummaryMetrics(data)).toEqual({
      totalKg: 80,
      batchCount: 4,
      avgBatchKg: 20,
    });
  });

  it("falls back to zeros when no production summary is available", () => {
    const data = {
      today_roasts: 1,
      active_roasters: 1,
      low_stock_count: 0,
      inventory_alerts: [],
      schedule: [],
      live_roasters: [],
      recent_activity: [],
      production_summary: null,
    };

    expect(getProductionSummaryMetrics(data)).toEqual({
      totalKg: 0,
      batchCount: 0,
      avgBatchKg: 0,
    });
  });
});
