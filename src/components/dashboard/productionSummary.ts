import type { DashboardData } from "@/types";

export interface ProductionSummaryMetrics {
  totalKg: number;
  batchCount: number;
  avgBatchKg: number;
}

export function getProductionSummaryMetrics(
  data: DashboardData | null,
): ProductionSummaryMetrics {
  const summary = data?.production_summary;

  if (!summary || summary.total_roasts <= 0) {
    return {
      totalKg: summary?.total_weight_kg ?? 0,
      batchCount: summary?.total_roasts ?? 0,
      avgBatchKg: 0,
    };
  }

  return {
    totalKg: summary.total_weight_kg,
    batchCount: summary.total_roasts,
    avgBatchKg: summary.total_weight_kg / summary.total_roasts,
  };
}
