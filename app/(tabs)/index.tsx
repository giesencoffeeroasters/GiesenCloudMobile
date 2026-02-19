import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";
import type { ApiResponse, DashboardData, RoastPlan } from "@/types";

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    try {
      const response = await apiClient.get<ApiResponse<DashboardData>>("/dashboard");
      setData(response.data.data);
    } catch {
      // Silently fail - data will remain null and the empty state shows
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchDashboard(true)}
          tintColor={Colors.slate}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <View>
            <Text style={styles.teamName}>
              {user?.current_team?.name ?? "GiesenCloud"}
            </Text>
            <Text style={styles.greeting}>Welcome, {user?.name ?? "User"}</Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard
              title="Today's Roasts"
              value={data?.today_roasts ?? 0}
              color={Colors.sky}
            />
            <StatCard
              title="Active Roasters"
              value={data?.active_roasters ?? 0}
              color={Colors.leaf}
            />
            <StatCard
              title="Low Stock"
              value={data?.low_stock_count ?? 0}
              color={data?.low_stock_count ? Colors.traffic : Colors.textTertiary}
            />
          </View>

          {/* Today's Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {data?.schedule && data.schedule.length > 0 ? (
              data.schedule.map((plan) => (
                <ScheduleCard key={plan.id} plan={plan} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No roasts scheduled for today
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  color: string;
}

function StatCard({ title, value, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

interface ScheduleCardProps {
  plan: RoastPlan;
}

function ScheduleCard({ plan }: ScheduleCardProps) {
  const statusColor: Record<string, string> = {
    pending: Colors.sun,
    in_progress: Colors.sky,
    completed: Colors.leaf,
    cancelled: Colors.traffic,
  };

  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleCardHeader}>
        <Text style={styles.scheduleProfileName}>{plan.profile.name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor[plan.status] ?? Colors.textTertiary },
          ]}
        >
          <Text style={styles.statusText}>{plan.status.replace("_", " ")}</Text>
        </View>
      </View>
      <View style={styles.scheduleDetails}>
        <Text style={styles.scheduleDetailText}>{plan.device.name}</Text>
        <Text style={styles.scheduleDetailSeparator}> / </Text>
        <Text style={styles.scheduleDetailText}>{plan.green_coffee}</Text>
        <Text style={styles.scheduleDetailSeparator}> / </Text>
        <Text style={styles.scheduleDataText}>{plan.batch_size} kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  contentContainer: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "DMSans-Bold",
    fontSize: 18,
    color: Colors.card,
    lineHeight: 22,
  },
  teamName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  greeting: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 4,
  },
  statTitle: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  scheduleCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  scheduleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scheduleProfileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.card,
    textTransform: "capitalize",
  },
  scheduleDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleDetailText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scheduleDetailSeparator: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  scheduleDataText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
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
});
