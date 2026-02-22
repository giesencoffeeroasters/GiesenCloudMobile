import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import apiClient from "@/api/client";
import type {
  CalendarTask,
  CalendarData,
  TeamAsset,
  MaintenancePriority,
  MaintenanceTaskStatus,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatSelectedDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

function getHighestPriorityColor(tasks: CalendarTask[]): string {
  const priorities: MaintenancePriority[] = [
    "critical",
    "high",
    "medium",
    "low",
  ];
  for (const p of priorities) {
    if (tasks.some((t) => t.priority === p)) {
      return getPriorityColor(p);
    }
  }
  return Colors.textTertiary;
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: CalendarTaskCard                                        */
/* ------------------------------------------------------------------ */

function CalendarTaskCard({ task }: { task: CalendarTask }) {
  return (
    <TouchableOpacity
      style={styles.taskCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/maintenance/${task.id}`)}
    >
      <View
        style={[
          styles.taskPriorityStripe,
          { backgroundColor: getPriorityColor(task.priority) },
        ]}
      />
      <View style={styles.taskContent}>
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
        {task.asset_name ? (
          <Text style={styles.taskAssetName} numberOfLines={1}>
            {task.asset_name}
          </Text>
        ) : null}
        {task.assignee_name ? (
          <Text style={styles.taskAssigneeName} numberOfLines={1}>
            {task.assignee_name}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [assets, setAssets] = useState<TeamAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayStr = formatISODate(new Date());

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

  const fetchCalendar = useCallback(async () => {
    try {
      const startDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );

      const params = new URLSearchParams();
      params.append("start_date", formatISODate(startDate));
      params.append("end_date", formatISODate(endDate));
      selectedAssets.forEach((id) => params.append("asset_ids[]", id));

      const response = await apiClient.get(
        `/maintenance/calendar?${params.toString()}`
      );
      setCalendarData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    }
  }, [currentMonth, selectedAssets]);

  const loadData = useCallback(async () => {
    await Promise.all([fetchCalendar(), fetchAssets()]);
  }, [fetchCalendar, fetchAssets]);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setIsLoading(false));
    }, [loadData])
  );

  useEffect(() => {
    fetchCalendar();
  }, [selectedAssets, currentMonth]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const goToPrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(formatISODate(new Date()));
  };

  const onAssetToggle = useCallback((hubspotId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(hubspotId)
        ? prev.filter((id) => id !== hubspotId)
        : [...prev, hubspotId]
    );
  }, []);

  /* ── Calendar grid ── */
  const gridRows = buildCalendarGrid(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  const selectedTasks: CalendarTask[] =
    selectedDate && calendarData[selectedDate]
      ? calendarData[selectedDate]
      : [];

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <BackIcon color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Maintenance Calendar</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <BackIcon color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance Calendar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeftIcon color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {formatMonthLabel(currentMonth)}
          </Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRightIcon color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.todayBtn}
            activeOpacity={0.7}
            onPress={goToToday}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

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

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {/* Day-of-week headers */}
          <View style={styles.calendarHeaderRow}>
            {DAY_HEADERS.map((day) => (
              <View key={day} style={styles.calendarHeaderCell}>
                <Text style={styles.calendarHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Day rows */}
          {gridRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.calendarRow}>
              {row.map((day, colIdx) => {
                if (day === null) {
                  return (
                    <View
                      key={`empty-${rowIdx}-${colIdx}`}
                      style={styles.calendarCell}
                    />
                  );
                }

                const dateStr = formatISODate(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day
                  )
                );
                const dayTasks = calendarData[dateStr] ?? [];
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                      isToday && !isSelected && styles.calendarCellToday,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedDate(dateStr)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isToday && !isSelected && styles.calendarDayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                    {dayTasks.length > 0 && (
                      <View
                        style={[
                          styles.calendarDot,
                          {
                            backgroundColor: getHighestPriorityColor(dayTasks),
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected day tasks */}
        {selectedDate ? (
          <View style={styles.selectedDaySection}>
            <Text style={styles.selectedDayHeader}>
              Tasks for {formatSelectedDateLabel(selectedDate)}
            </Text>
            {selectedTasks.length > 0 ? (
              selectedTasks.map((task) => (
                <CalendarTaskCard key={task.id} task={task} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No tasks for this day</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.selectedDaySection}>
            <Text style={styles.selectedDayHeader}>Select a day</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Tap a day to see its tasks
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
  },
  headerSpacer: {
    width: 40,
  },

  /* -- Month navigation -- */
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  monthLabel: {
    flex: 1,
    fontFamily: "DMSans-SemiBold",
    fontSize: 17,
    color: Colors.text,
    textAlign: "center",
  },
  todayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.slate,
  },
  todayBtnText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: "#ffffff",
  },

  /* -- Asset filter chips -- */
  assetFilterRow: {
    maxHeight: 44,
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

  /* -- Calendar grid -- */
  calendarGrid: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  calendarHeaderText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  calendarRow: {
    flexDirection: "row",
  },
  calendarCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 8,
  },
  calendarCellSelected: {
    backgroundColor: Colors.safety,
  },
  calendarCellToday: {
    backgroundColor: Colors.gravelLight,
  },
  calendarDayText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 14,
    color: Colors.text,
  },
  calendarDayTextSelected: {
    fontFamily: "JetBrainsMono-Bold",
    color: Colors.slate,
  },
  calendarDayTextToday: {
    fontFamily: "JetBrainsMono-Bold",
    color: Colors.text,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },

  /* -- Selected day section -- */
  selectedDaySection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  selectedDayHeader: {
    fontFamily: "DMSans-Bold",
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 12,
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
    gap: 6,
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
  taskAssetName: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  taskAssigneeName: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
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
