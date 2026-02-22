import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";
import type {
  MaintenanceTask,
  MaintenanceSummary,
  MaintenanceTaskStatus,
  MaintenancePriority,
  WarrantyStatus,
  TeamAsset,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPriorityColor(priority: MaintenancePriority): string {
  switch (priority) {
    case "critical":
      return Colors.traffic;
    case "high":
      return Colors.boven;
    case "medium":
      return Colors.sun;
    case "low":
      return Colors.sky;
  }
}

function getPriorityBg(priority: MaintenancePriority): string {
  switch (priority) {
    case "critical":
      return Colors.trafficBg;
    case "high":
      return Colors.bovenBg;
    case "medium":
      return Colors.sunBg;
    case "low":
      return Colors.skyBg;
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

function getComplianceColor(score: number): string {
  if (score >= 80) return Colors.leaf;
  if (score >= 60) return Colors.sun;
  return Colors.traffic;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function WrenchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
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
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 3a4 4 0 100 8 4 4 0 000-8z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
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

function CalendarHeaderIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Compliance Card                                         */
/* ------------------------------------------------------------------ */

function ComplianceCard({
  assetName,
  warrantyStatus,
  score,
}: {
  assetName: string;
  warrantyStatus: WarrantyStatus;
  score: number;
}) {
  const compColor = getComplianceColor(score);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <View style={styles.complianceCard}>
      <Text style={styles.complianceAssetName} numberOfLines={1}>
        {assetName}
      </Text>
      <View
        style={[
          styles.warrantyBadge,
          { backgroundColor: getWarrantyBg(warrantyStatus) },
        ]}
      >
        <ShieldIcon color={getWarrantyColor(warrantyStatus)} />
        <Text
          style={[
            styles.warrantyBadgeText,
            { color: getWarrantyColor(warrantyStatus) },
          ]}
        >
          {getWarrantyLabel(warrantyStatus)}
        </Text>
      </View>
      <View style={styles.complianceScoreRow}>
        <Text style={[styles.complianceScore, { color: compColor }]}>
          {score}%
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
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Task Card                                               */
/* ------------------------------------------------------------------ */

function TaskCard({ task }: { task: MaintenanceTask }) {
  const dueOverdue =
    task.due_at && task.status !== "completed" && task.status !== "skipped"
      ? isOverdue(task.due_at)
      : false;
  const stepPct =
    task.steps_total > 0
      ? Math.round((task.steps_completed / task.steps_total) * 100)
      : 0;

  return (
    <TouchableOpacity
      style={styles.taskCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/maintenance/${task.id}`)}
    >
      {/* Priority stripe */}
      <View
        style={[
          styles.taskPriorityStripe,
          { backgroundColor: getPriorityColor(task.priority) },
        ]}
      />

      <View style={styles.taskContent}>
        {/* Title + status */}
        <View style={styles.taskTopRow}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>
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
              {getStatusLabel(task.status)}
            </Text>
          </View>
        </View>

        {/* Due date */}
        {task.due_at && (
          <View style={styles.taskMetaItem}>
            <CalendarIcon
              color={dueOverdue ? Colors.traffic : Colors.textTertiary}
            />
            <Text
              style={[
                styles.taskMetaText,
                dueOverdue && { color: Colors.traffic },
              ]}
            >
              Due {formatDate(task.due_at)}
            </Text>
          </View>
        )}

        {/* Asset name */}
        {task.asset && (
          <View style={styles.taskMetaItem}>
            <WrenchIcon color={Colors.textTertiary} />
            <Text style={styles.taskMetaText} numberOfLines={1}>
              {task.asset.name}
            </Text>
          </View>
        )}

        {/* Assignee */}
        {task.assignee && (
          <View style={styles.taskMetaItem}>
            <UserIcon color={Colors.textTertiary} />
            <Text style={styles.taskMetaText}>{task.assignee.name}</Text>
          </View>
        )}

        {/* Step progress */}
        {task.steps_total > 0 && (
          <View style={styles.stepProgressSection}>
            <View style={styles.stepProgressLabelRow}>
              <Text style={styles.stepProgressLabel}>
                {task.steps_completed} / {task.steps_total} steps
              </Text>
              <Text style={styles.stepProgressPct}>{stepPct}%</Text>
            </View>
            <View style={styles.stepProgressTrack}>
              <View
                style={[
                  styles.stepProgressFill,
                  {
                    width: `${stepPct}%`,
                    backgroundColor: getStatusColor(task.status),
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

type FilterOption =
  | "all"
  | "overdue"
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "skipped", label: "Skipped" },
];

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [assets, setAssets] = useState<TeamAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const fetchAssets = useCallback(async () => {
    try {
      const response = await apiClient.get("/equipment");
      setAssets(
        response.data.data.map((d: any) => ({
          hubspot_id: d.id,
          name: d.name,
          model: d.model,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  }, []);

  const fetchTasks = useCallback(
    async (status?: MaintenanceTaskStatus) => {
      try {
        const params = new URLSearchParams();
        params.append("per_page", "50");
        if (status) {
          params.append("status", status);
        }
        selectedAssets.forEach((id) => params.append("asset_ids[]", id));
        const response = await apiClient.get(
          `/maintenance/tasks?${params.toString()}`
        );
        setTasks(response.data.data);
      } catch (error) {
        console.error("Failed to fetch maintenance tasks:", error);
      }
    },
    [selectedAssets]
  );

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      selectedAssets.forEach((id) => params.append("asset_ids[]", id));
      const url = params.toString()
        ? `/maintenance/summary?${params.toString()}`
        : "/maintenance/summary";
      const response = await apiClient.get(url);
      setSummary(response.data.data);
    } catch (error) {
      console.error("Failed to fetch maintenance summary:", error);
    }
  }, [selectedAssets]);

  const loadData = useCallback(
    async (filter?: FilterOption) => {
      const statusParam =
        filter && filter !== "all"
          ? (filter as MaintenanceTaskStatus)
          : undefined;
      await Promise.all([fetchTasks(statusParam), fetchSummary()]);
    },
    [fetchTasks, fetchSummary]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
      loadData(activeFilter).finally(() => setIsLoading(false));
    }, [loadData, activeFilter, fetchAssets, user?.current_team?.id])
  );

  useEffect(() => {
    loadData(activeFilter);
  }, [selectedAssets]);

  const onAssetToggle = useCallback((hubspotId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(hubspotId)
        ? prev.filter((id) => id !== hubspotId)
        : [...prev, hubspotId]
    );
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(activeFilter);
    setIsRefreshing(false);
  }, [loadData, activeFilter]);

  const onFilterPress = useCallback(
    (filter: FilterOption) => {
      setActiveFilter(filter);
      setIsLoading(true);
      const statusParam =
        filter !== "all" ? (filter as MaintenanceTaskStatus) : undefined;
      fetchTasks(statusParam).finally(() => setIsLoading(false));
    },
    [fetchTasks]
  );

  /* Compliance average */
  const complianceScores = summary?.compliance_scores ?? [];
  const avgCompliance =
    complianceScores.length > 0
      ? Math.round(
          complianceScores.reduce((sum, c) => sum + c.score, 0) /
            complianceScores.length
        )
      : null;
  const avgCompColor =
    avgCompliance !== null ? getComplianceColor(avgCompliance) : Colors.textSecondary;

  /* ── Loading state ── */
  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.gLogo}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Maintenance</Text>
              <Text style={styles.headerSubtitle}>Tasks & Compliance</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerCalendarBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/maintenance/calendar")}
          >
            <CalendarHeaderIcon color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  /* ── Render task item ── */
  const renderTask = ({ item }: { item: MaintenanceTask }) => (
    <TaskCard task={item} />
  );

  return (
    <View style={styles.container}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.gLogo}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Maintenance</Text>
            <Text style={styles.headerSubtitle}>Tasks & Compliance</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerCalendarBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/maintenance/calendar")}
        >
          <CalendarHeaderIcon color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterChip,
              activeFilter === option.key && styles.filterChipActive,
            ]}
            activeOpacity={0.7}
            onPress={() => onFilterPress(option.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === option.key && styles.filterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Asset filter chips */}
      {assets.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.assetFilterRow}
          contentContainerStyle={styles.assetFilterRowContent}
        >
          {assets.map((asset) => {
            const isSelected = selectedAssets.includes(asset.hubspot_id);
            return (
              <TouchableOpacity
                key={asset.hubspot_id}
                style={[
                  styles.assetChip,
                  isSelected && styles.assetChipActive,
                ]}
                activeOpacity={0.7}
                onPress={() => onAssetToggle(asset.hubspot_id)}
              >
                <Text
                  style={[
                    styles.assetChipText,
                    isSelected && styles.assetChipTextActive,
                  ]}
                >
                  {asset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTask}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statStripe,
                    { backgroundColor: Colors.traffic },
                  ]}
                />
                <Text style={[styles.statValue, { color: Colors.traffic }]}>
                  {summary?.overdue_count ?? "-"}
                </Text>
                <Text style={styles.statLabel}>OVERDUE</Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statStripe,
                    { backgroundColor: Colors.sky },
                  ]}
                />
                <Text style={[styles.statValue, { color: Colors.sky }]}>
                  {summary?.pending_count ?? "-"}
                </Text>
                <Text style={styles.statLabel}>PENDING</Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statStripe,
                    { backgroundColor: avgCompColor },
                  ]}
                />
                <Text style={[styles.statValue, { color: avgCompColor }]}>
                  {avgCompliance !== null ? `${avgCompliance}%` : "-"}
                </Text>
                <Text style={styles.statLabel}>AVG COMPLIANCE</Text>
              </View>
            </View>

            {/* Compliance section */}
            {complianceScores.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Warranty & Compliance
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push("/maintenance/warranties")}
                  >
                    <Text style={styles.viewAllLink}>View All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.complianceScroll}
                >
                  {complianceScores.map((item, idx) => (
                    <ComplianceCard
                      key={`${item.asset_name}-${idx}`}
                      assetName={item.asset_name}
                      warrantyStatus={item.warranty_status}
                      score={item.score}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Task list header */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tasks</Text>
                <Text style={styles.sectionCount}>
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tasks found.</Text>
          </View>
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.safety,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
  },
  headerSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },

  headerCalendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- Filter chips -- */
  filterRow: {
    backgroundColor: Colors.slate,
    maxHeight: 44,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.headerOverlay,
  },
  filterChipActive: {
    backgroundColor: Colors.safety,
  },
  filterChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: "#ffffff",
  },
  filterChipTextActive: {
    color: Colors.slate,
  },

  /* -- Asset filter chips -- */
  assetFilterRow: {
    maxHeight: 44,
    backgroundColor: Colors.bg,
  },
  assetFilterRowContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  assetChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assetChipActive: {
    backgroundColor: Colors.safety,
    borderColor: Colors.safety,
  },
  assetChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  assetChipTextActive: {
    color: Colors.slate,
  },

  /* -- Stats row -- */
  statsRow: {
    flexDirection: "row",
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    overflow: "hidden",
    position: "relative",
  },
  statStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 28,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* -- Section -- */
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  viewAllLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },

  /* -- Compliance cards -- */
  complianceScroll: {
    gap: 10,
  },
  complianceCard: {
    width: 160,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  complianceAssetName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  warrantyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warrantyBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 10,
  },
  complianceScoreRow: {
    marginTop: 2,
  },
  complianceScore: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  complianceBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gravelLight,
    overflow: "hidden",
  },
  complianceBarFill: {
    height: 5,
    borderRadius: 3,
  },

  /* -- Task card -- */
  taskCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 10,
  },
  taskPriorityStripe: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  taskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  taskTitle: {
    flex: 1,
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },
  taskMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* Step progress */
  stepProgressSection: {
    gap: 4,
    marginTop: 2,
  },
  stepProgressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepProgressLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stepProgressPct: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  stepProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gravelLight,
    overflow: "hidden",
  },
  stepProgressFill: {
    height: 5,
    borderRadius: 3,
  },

  /* -- Empty state -- */
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },
});
