import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect, ErrorBoundaryProps } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type {
  WarrantyDetail,
  WarrantyStatus,
  MaintenanceTask,
  MaintenanceTaskStatus,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getComplianceColor(score: number): string {
  if (score >= 80) return Colors.leaf;
  if (score >= 60) return Colors.sun;
  return Colors.traffic;
}

function getWarrantyColor(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return Colors.leaf;
    case "suspended":
      return Colors.sun;
    case "expired":
      return Colors.traffic;
    case "voided":
      return Colors.textTertiary;
  }
}

function getWarrantyBg(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return Colors.leafBg;
    case "suspended":
      return Colors.sunBg;
    case "expired":
      return Colors.trafficBg;
    case "voided":
      return Colors.gravelLight;
  }
}

function getWarrantyLabel(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "expired":
      return "Expired";
    case "voided":
      return "Voided";
  }
}

function getStatusColor(status: MaintenanceTaskStatus): string {
  switch (status) {
    case "overdue":
      return Colors.traffic;
    case "pending":
      return Colors.sky;
    case "in_progress":
      return Colors.boven;
    case "completed":
      return Colors.leaf;
    case "skipped":
      return Colors.textTertiary;
  }
}

function getStatusBg(status: MaintenanceTaskStatus): string {
  switch (status) {
    case "overdue":
      return Colors.trafficBg;
    case "pending":
      return Colors.skyBg;
    case "in_progress":
      return Colors.bovenBg;
    case "completed":
      return Colors.leafBg;
    case "skipped":
      return Colors.gravelLight;
  }
}

function getStatusLabel(status: MaintenanceTaskStatus): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "skipped":
      return "Skipped";
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Task Summary Stat                                                  */
/* ------------------------------------------------------------------ */

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.summaryStatItem}>
      <Text style={[styles.summaryStatValue, { color }]}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Task Row                                                    */
/* ------------------------------------------------------------------ */

function RecentTaskRow({ task }: { task: MaintenanceTask }) {
  return (
    <TouchableOpacity
      style={styles.recentTaskRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/maintenance/${task.id}`)}
    >
      <View style={styles.recentTaskContent}>
        <Text style={styles.recentTaskTitle} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.recentTaskMeta}>
          {task.due_at ? (
            <View style={styles.recentTaskMetaItem}>
              <CalendarIcon color={Colors.textTertiary} />
              <Text style={styles.recentTaskMetaText}>
                {formatDate(task.due_at)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.recentTaskRight}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBg(task.status) },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: getStatusColor(task.status) },
            ]}
          >
            {task.status_label || getStatusLabel(task.status)}
          </Text>
        </View>
        <ChevronRightIcon color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function WarrantyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [warranty, setWarranty] = useState<WarrantyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -- Fetch warranty detail -- */
  const fetchWarranty = useCallback(async () => {
    try {
      const response = await apiClient.get(`/maintenance/warranties/${id}`);
      setWarranty(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch warranty detail:", err);
      setError("Failed to load warranty details.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        if (mounted) {
          await fetchWarranty();
          setLoading(false);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [fetchWarranty])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWarranty();
    setRefreshing(false);
  }, [fetchWarranty]);

  /* -- Header -- */
  function renderHeader(title?: string) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.navigate("/(tabs)/maintenance")}
            >
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle}>Warranty</Text>
              {title ? (
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {title}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* -- Loading -- */
  if (loading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  /* -- Error -- */
  if (error || !warranty) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {error ?? "Warranty not found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.navigate("/(tabs)/maintenance")}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* -- Data -- */
  const compColor = getComplianceColor(warranty.compliance_score);
  const pct = Math.min(100, Math.max(0, warranty.compliance_score));
  const summary = warranty.tasks_summary;
  const recentTasks = warranty.recent_tasks ?? [];

  return (
    <View style={styles.screen}>
      {renderHeader(warranty.asset_name)}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* -- Compliance Card -- */}
        <View style={styles.card}>
          <View style={styles.complianceHeader}>
            <ShieldIcon color={Colors.sky} />
            <Text style={styles.sectionTitle}>Compliance</Text>
          </View>

          <View style={styles.complianceScoreRow}>
            <Text style={[styles.complianceScoreValue, { color: compColor }]}>
              {warranty.compliance_score}
            </Text>
            <Text style={[styles.complianceScoreSuffix, { color: compColor }]}>
              %
            </Text>
          </View>

          <View style={styles.complianceBarTrack}>
            <View
              style={[
                styles.complianceBarFill,
                { width: `${pct}%`, backgroundColor: compColor },
              ]}
            />
          </View>

          <View style={styles.complianceMetaRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: getWarrantyBg(warranty.status) },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: getWarrantyColor(warranty.status) },
                ]}
              >
                {getWarrantyLabel(warranty.status)}
              </Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Started</Text>
              <Text style={styles.dateValue}>
                {formatDate(warranty.started_at)}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Expires</Text>
              <Text style={styles.dateValue}>
                {formatDate(warranty.expires_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* -- Task Summary Card -- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Task Summary</Text>

          <View style={styles.summaryGrid}>
            <SummaryStat
              label="Completed"
              value={summary.completed}
              color={Colors.leaf}
            />
            <SummaryStat
              label="Pending"
              value={summary.pending}
              color={Colors.sky}
            />
            <SummaryStat
              label="Overdue"
              value={summary.overdue}
              color={Colors.traffic}
            />
            <SummaryStat
              label="Skipped"
              value={summary.skipped}
              color={Colors.textTertiary}
            />
            <SummaryStat
              label="In Progress"
              value={summary.in_progress}
              color={Colors.boven}
            />
            <SummaryStat
              label="Total"
              value={summary.total}
              color={Colors.text}
            />
          </View>
        </View>

        {/* -- Recent Tasks -- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>

          {recentTasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks yet.</Text>
          ) : (
            <View style={styles.recentTasksList}>
              {recentTasks.map((task, index) => (
                <View key={task.id}>
                  {index > 0 ? <View style={styles.taskDivider} /> : null}
                  <RecentTaskRow task={task} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Error Boundary                                                     */
/* ------------------------------------------------------------------ */

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <Text
        style={{
          fontFamily: "DMSans-SemiBold",
          fontSize: 18,
          color: Colors.text,
          marginBottom: 12,
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontFamily: "DMSans-Regular",
          fontSize: 13,
          color: Colors.textSecondary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {error.message}
      </Text>
      <Text
        style={{
          fontFamily: "JetBrainsMono-Regular",
          fontSize: 11,
          color: Colors.textTertiary,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        {error.stack?.split("\n").slice(0, 5).join("\n")}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: Colors.slate,
          borderRadius: 8,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
        onPress={retry}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            fontSize: 14,
            color: "#ffffff",
          }}
        >
          Try Again
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginTop: 12, paddingVertical: 8 }}
        onPress={() => router.navigate("/(tabs)/maintenance")}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            fontSize: 14,
            color: Colors.sky,
          }}
        >
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.safety,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: "#ffffff",
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginBottom: 2,
  },

  /* -- Loading / Error -- */
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: "#ffffff",
  },

  /* -- Content -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* -- Card -- */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },

  /* -- Section title -- */
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },

  /* -- Compliance -- */
  complianceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  complianceScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  complianceScoreValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -2,
  },
  complianceScoreSuffix: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 24,
    marginLeft: 2,
  },
  complianceBarTrack: {
    height: 8,
    backgroundColor: Colors.gravelLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  complianceBarFill: {
    height: 8,
    borderRadius: 4,
  },
  complianceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  /* -- Badges -- */
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },

  /* -- Dates -- */
  dateRow: {
    flexDirection: "row",
    gap: 16,
  },
  dateItem: {
    flex: 1,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    padding: 12,
  },
  dateLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  dateValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },

  /* -- Task Summary -- */
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  summaryStatItem: {
    width: "33.33%",
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryStatValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -1,
  },
  summaryStatLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  /* -- Status badge -- */
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },

  /* -- Recent Tasks -- */
  recentTasksList: {
    gap: 0,
  },
  taskDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 0,
  },
  recentTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  recentTaskContent: {
    flex: 1,
    gap: 4,
  },
  recentTaskTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  recentTaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentTaskMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recentTaskMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  recentTaskRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* -- Empty text -- */
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
});
