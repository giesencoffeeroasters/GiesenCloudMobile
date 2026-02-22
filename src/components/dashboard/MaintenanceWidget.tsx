import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import apiClient from "@/api/client";
import type { DashboardData } from "@/types";

interface MaintenanceWidgetProps {
  data: DashboardData | null;
}

interface MaintenanceWidgetData {
  overdue_count: number;
  pending_count: number;
  in_progress_count: number;
  completed_this_month: number;
  compliance_scores: { asset_name: string; score: number }[];
}

function getComplianceColor(score: number): string {
  if (score >= 80) return Colors.leaf;
  if (score >= 60) return Colors.sun;
  return Colors.traffic;
}

export function MaintenanceWidget({ data: _data }: MaintenanceWidgetProps) {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMaintenance() {
      try {
        const response = await apiClient.get("/maintenance/summary");
        setMaintenanceData(response.data.data);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchMaintenance();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Maintenance</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        </View>
      </View>
    );
  }

  if (!maintenanceData) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Maintenance</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No maintenance data</Text>
        </View>
      </View>
    );
  }

  const avgCompliance =
    maintenanceData.compliance_scores.length > 0
      ? maintenanceData.compliance_scores.reduce((sum, c) => sum + c.score, 0) /
        maintenanceData.compliance_scores.length
      : 100;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Maintenance</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/maintenance")}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, maintenanceData.overdue_count > 0 && styles.statCardAlert]}>
          <Text
            style={[
              styles.statValue,
              { color: maintenanceData.overdue_count > 0 ? Colors.traffic : Colors.text },
            ]}
          >
            {maintenanceData.overdue_count}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.sky }]}>
            {maintenanceData.pending_count}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: getComplianceColor(avgCompliance) }]}>
            {Math.round(avgCompliance)}%
          </Text>
          <Text style={styles.statLabel}>Compliance</Text>
        </View>
      </View>

      {/* Overdue tasks summary */}
      {maintenanceData.overdue_count > 0 && (
        <TouchableOpacity
          style={styles.overdueBar}
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/maintenance")}
        >
          <View style={styles.overdueDot} />
          <Text style={styles.overdueText}>
            {maintenanceData.overdue_count} overdue task
            {maintenanceData.overdue_count !== 1 ? "s" : ""} need attention
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  viewAllLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },
  loadingContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statCardAlert: {
    borderColor: Colors.trafficBg,
    backgroundColor: Colors.trafficBg,
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 20,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overdueBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.trafficBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  overdueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.traffic,
  },
  overdueText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.traffic,
    flex: 1,
  },
});
