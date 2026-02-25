import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Switch,
  ScrollView,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { HamburgerButton } from "@/components/HamburgerButton";
import { WIDGET_MAP } from "@/constants/widgets";
import { useAuthStore } from "@/stores/authStore";
import { useWidgetStore } from "@/stores/widgetStore";
import apiClient from "@/api/client";
import type { ApiResponse, DashboardData } from "@/types";
import { useRoastPlanningBroadcast } from "@/hooks/useRoastPlanningBroadcast";

import { QuickStatsWidget } from "@/components/dashboard/QuickStatsWidget";
import { ScheduleWidget } from "@/components/dashboard/ScheduleWidget";
import { LiveRoastersWidget } from "@/components/dashboard/LiveRoastersWidget";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { InventoryAlertsWidget } from "@/components/dashboard/InventoryAlertsWidget";
import { ProductionSummaryWidget } from "@/components/dashboard/ProductionSummaryWidget";
import { RecentRoastsWidget } from "@/components/dashboard/RecentRoastsWidget";
import { MaintenanceWidget } from "@/components/dashboard/MaintenanceWidget";

type WidgetProps = { data: DashboardData | null };

const WIDGET_COMPONENTS: Record<string, React.ComponentType<WidgetProps>> = {
  quick_stats: QuickStatsWidget,
  todays_schedule: ScheduleWidget,
  live_roasters: LiveRoastersWidget,
  quick_actions: QuickActionsWidget,
  recent_activity: RecentActivityWidget,
  inventory_alerts: InventoryAlertsWidget,
  production_summary: ProductionSummaryWidget,
  recent_roasts: RecentRoastsWidget,
  maintenance_overview: MaintenanceWidget,
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const {
    widgetOrder,
    disabledWidgets,
    isLoaded,
    loadWidgets,
    setWidgetOrder,
    toggleWidget,
    resetToDefault,
  } = useWidgetStore();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const teamId = user?.current_team?.id;

  const fetchDashboard = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      try {
        const response =
          await apiClient.get<ApiResponse<DashboardData>>("/dashboard");
        setData(response.data.data);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useRoastPlanningBroadcast(() => {
    fetchDashboard();
  });

  useEffect(() => {
    loadWidgets();
  }, []);

  // Fetch on focus and when team changes
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard, teamId])
  );

  // Clear old data and refetch when team changes
  useEffect(() => {
    setData(null);
    setIsLoading(true);
    fetchDashboard();
  }, [teamId, fetchDashboard]);

  const renderWidget = useCallback(
    (key: string) => {
      const Component = WIDGET_COMPONENTS[key];
      if (!Component) return null;
      return (
        <View key={key} style={styles.widgetWrapper}>
          <Component data={data} />
        </View>
      );
    },
    [data]
  );

  /* ── Edit mode: move helpers ── */
  const moveWidget = useCallback(
    (index: number, direction: "up" | "down") => {
      const newOrder = [...widgetOrder];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newOrder.length) return;
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setWidgetOrder(newOrder);
    },
    [widgetOrder, setWidgetOrder]
  );

  if (!isLoaded) return null;

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <HamburgerButton />
            <View>
              <Text style={styles.headerTitle}>
                {isEditMode ? "Edit Dashboard" : "Dashboard"}
              </Text>
              {!isEditMode && (
                <Text style={styles.headerSubtitle}>
                  {user?.current_team?.name ?? "GiesenCloud"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            {isEditMode ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsEditMode(false)}
                style={styles.doneButton}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.headerButton}
                  activeOpacity={0.7}
                  onPress={() => setIsEditMode(true)}
                >
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Path
                      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                      stroke="#fff"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke="#fff"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  activeOpacity={0.7}
                  onPress={() => router.push("/notifications")}
                >
                  <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Path
                      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                      stroke="#fff"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M13.73 21a2 2 0 0 1-3.46 0"
                      stroke="#fff"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ── Content ── */}
      {isEditMode ? (
        <ScrollView
          style={styles.editContainer}
          contentContainerStyle={styles.editListContent}
        >
          <Text style={styles.editSectionLabel}>ACTIVE WIDGETS</Text>
          {widgetOrder.map((key, index) => {
            const widget = WIDGET_MAP[key];
            if (!widget) return null;
            return (
              <View key={key} style={styles.editCard}>
                {/* Move buttons */}
                <View style={styles.moveButtons}>
                  <TouchableOpacity
                    onPress={() => moveWidget(index, "up")}
                    disabled={index === 0}
                    style={[styles.moveButton, index === 0 && { opacity: 0.3 }]}
                    activeOpacity={0.6}
                  >
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M18 15l-6-6-6 6"
                        stroke={Colors.textSecondary}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveWidget(index, "down")}
                    disabled={index === widgetOrder.length - 1}
                    style={[styles.moveButton, index === widgetOrder.length - 1 && { opacity: 0.3 }]}
                    activeOpacity={0.6}
                  >
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M6 9l6 6 6-6"
                        stroke={Colors.textSecondary}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                </View>

                {/* Widget info */}
                <View style={styles.editInfo}>
                  <Text style={styles.editTitle}>{widget.title}</Text>
                  <Text style={styles.editDescription}>{widget.description}</Text>
                </View>

                {/* Toggle */}
                <Switch
                  value={true}
                  onValueChange={() => toggleWidget(key)}
                  trackColor={{ false: Colors.border, true: Colors.safety }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}

          {/* Disabled widgets */}
          {disabledWidgets.length > 0 && (
            <>
              <Text style={[styles.editSectionLabel, { marginTop: 24 }]}>
                AVAILABLE WIDGETS
              </Text>
              {disabledWidgets.map((key) => {
                const widget = WIDGET_MAP[key];
                if (!widget) return null;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.editCard, styles.editCardDisabled]}
                    activeOpacity={0.7}
                    onPress={() => toggleWidget(key)}
                  >
                    <View style={styles.dragHandle}>
                      <Svg
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          d="M12 5v14M5 12h14"
                          stroke={Colors.sky}
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </Svg>
                    </View>
                    <View style={styles.editInfo}>
                      <Text
                        style={[
                          styles.editTitle,
                          { color: Colors.textSecondary },
                        ]}
                      >
                        {widget.title}
                      </Text>
                      <Text style={styles.editDescription}>
                        {widget.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Reset button */}
          <TouchableOpacity
            style={styles.resetButton}
            activeOpacity={0.7}
            onPress={resetToDefault}
          >
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchDashboard(true)}
              tintColor={Colors.slate}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.slate} />
            </View>
          ) : (
            widgetOrder.map((key) => renderWidget(key))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* ── Header ── */
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.safety,
  },
  doneButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.slate,
  },

  /* ── Normal mode ── */
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
  },
  widgetWrapper: {
    marginBottom: 20,
  },

  /* ── Edit mode ── */
  editContainer: {
    flex: 1,
  },
  editListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  editSectionLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  editCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 12,
  },
  editCardDisabled: {
    opacity: 0.6,
  },
  moveButtons: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  moveButton: {
    width: 28,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  editInfo: {
    flex: 1,
  },
  editTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  editDescription: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  resetButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 16,
  },
  resetButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.traffic,
  },
});
