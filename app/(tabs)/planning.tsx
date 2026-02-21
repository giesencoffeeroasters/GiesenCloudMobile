import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import { PlanningItem, ApiResponse } from "@/types/index";

type PlanStatus = "completed" | "in_progress" | "planned";

const VIEW_OPTIONS = ["Day", "Week", "List"] as const;

type ViewOption = (typeof VIEW_OPTIONS)[number];

const FILTER_OPTIONS = ["All", "Planned", "In Progress", "Completed"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

const FILTER_TO_STATUS: Record<FilterOption, PlanStatus | null> = {
  All: null,
  Planned: "planned",
  "In Progress": "in_progress",
  Completed: "completed",
};

const STATUS_CONFIG: Record<
  PlanStatus,
  { label: string; color: string; bg: string; borderColor: string; stripBg: string }
> = {
  completed: {
    label: "Done",
    color: Colors.leaf,
    bg: Colors.leafBg,
    borderColor: Colors.leaf,
    stripBg: Colors.gravelLight,
  },
  in_progress: {
    label: "Roasting",
    color: Colors.boven,
    bg: Colors.bovenBg,
    borderColor: Colors.boven,
    stripBg: Colors.bovenBg,
  },
  planned: {
    label: "Planned",
    color: Colors.sky,
    bg: Colors.skyBg,
    borderColor: Colors.sky,
    stripBg: Colors.gravelLight,
  },
};

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const FULL_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKS_TO_SHOW = 4;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractTime(isoString: string): { time: string; period: string } {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return {
    time: `${hours}:${minutes}`,
    period,
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface DayItem {
  type: "day";
  key: string;
  label: string;
  date: number;
  isToday: boolean;
  fullDate: Date;
}

interface WeekSeparator {
  type: "separator";
  key: string;
  label: string;
}

type DateStripItem = DayItem | WeekSeparator;

function getMultiWeekDays(): DateStripItem[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const items: DateStripItem[] = [];

  for (let week = 0; week < WEEKS_TO_SHOW; week++) {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + week * 7);

    if (week > 0) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const label =
        weekStart.getMonth() === weekEnd.getMonth()
          ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]}`
          : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]}`;
      items.push({ type: "separator", key: `sep-${week}`, label });
    }

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      items.push({
        type: "day",
        key: date.toISOString().split("T")[0],
        label: DAY_LABELS[i],
        date: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        fullDate: date,
      });
    }
  }

  return items;
}

/** Get just the DayItem entries from the strip (no separators). */
function getDayItems(items: DateStripItem[]): DayItem[] {
  return items.filter((i): i is DayItem => i.type === "day");
}

/** Get the 7 DayItems for the week that contains the given key. */
function getWeekForKey(dayItems: DayItem[], key: string): DayItem[] {
  const idx = dayItems.findIndex((d) => d.key === key);
  if (idx < 0) return dayItems.slice(0, 7);
  const weekStart = idx - (idx % 7);
  return dayItems.slice(weekStart, weekStart + 7);
}

function getPlanStatus(plan: PlanningItem): PlanStatus {
  if (plan.roasted_at) {
    return "completed";
  }
  if (plan.roasted_amount !== null && plan.roasted_amount > 0) {
    return "in_progress";
  }
  return "planned";
}

interface PlanCardProps {
  plan: PlanningItem;
  onPress?: () => void;
}

function PlanCard({ plan, onPress }: PlanCardProps) {
  const status = getPlanStatus(plan);
  const config = STATUS_CONFIG[status];
  const { time, period } = extractTime(plan.planned_at);
  const profileName = plan.profile?.name ?? "No profile";
  const deviceName = plan.device?.name ?? "Unknown device";
  const weight = plan.amount ? `${(plan.amount / 1000).toFixed(1)} kg` : "-";
  const duration = plan.profile?.duration
    ? formatDuration(plan.profile.duration)
    : "-";

  return (
    <TouchableOpacity
      style={styles.planCard}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Colored left border */}
      <View
        style={[styles.planCardBorder, { backgroundColor: config.borderColor }]}
      />

      {/* Time strip */}
      <View style={[styles.timeStrip, { backgroundColor: config.stripBg }]}>
        <Text style={styles.timeStripTime}>{time}</Text>
        <Text style={styles.timeStripPeriod}>{period}</Text>
      </View>

      {/* Card body */}
      <View style={styles.planCardBody}>
        {/* Top row: name + status badge */}
        <View style={styles.planCardTop}>
          <Text style={styles.planCardName} numberOfLines={1}>
            {plan.description ?? profileName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Meta row with icons */}
        <View style={styles.planCardMeta}>
          {/* Device */}
          <View style={styles.metaItem}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M2 6h20v12H2zM12 6V2M6 6V4M18 6V4"
                stroke={Colors.textTertiary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.metaText}>{deviceName}</Text>
          </View>

          {/* Weight */}
          <View style={styles.metaItem}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"
                stroke={Colors.textTertiary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.metaDataText}>{weight}</Text>
          </View>

          {/* Duration */}
          <View style={styles.metaItem}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"
                stroke={Colors.textTertiary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.metaDataText}>{duration}</Text>
          </View>
        </View>

        {/* Profile bar */}
        <View style={styles.profileBar}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 20V10M18 20V4M6 20v-4"
              stroke={Colors.grape}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.profileBarText} numberOfLines={1}>
            Profile: {profileName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewOption>("Day");
  const [plans, setPlans] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dateStripRef = useRef<ScrollView>(null);
  const todayOffsetRef = useRef<number>(0);
  const hasScrolledRef = useRef(false);

  const dateStripItems = useMemo(() => getMultiWeekDays(), []);
  const allDays = useMemo(() => getDayItems(dateStripItems), [dateStripItems]);

  const todayKey = useMemo(() => {
    const today = allDays.find((d) => d.isToday);
    return today?.key ?? allDays[0].key;
  }, [allDays]);

  const currentSelectedKey = selectedKey ?? todayKey;

  const selectedFullDate = useMemo(() => {
    const day = allDays.find((d) => d.key === currentSelectedKey);
    return day?.fullDate ?? new Date();
  }, [allDays, currentSelectedKey]);

  const dayName = FULL_DAY_NAMES[selectedFullDate.getDay()];

  /** The 7-day week that contains the currently selected day (for Week view). */
  const selectedWeekDays = useMemo(
    () => getWeekForKey(allDays, currentSelectedKey),
    [allDays, currentSelectedKey]
  );

  const scrollToToday = useCallback(() => {
    if (!hasScrolledRef.current && dateStripRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        dateStripRef.current?.scrollTo({ x: Math.max(0, todayOffsetRef.current - 16), animated: false });
      }, 50);
    }
  }, []);

  const fetchPlans = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        if (activeView === "Week" || activeView === "List") {
          const startDate = formatDate(selectedWeekDays[0].fullDate);
          const endDate = formatDate(selectedWeekDays[6].fullDate);
          const response = await apiClient.get<ApiResponse<PlanningItem[]>>(
            "/planning",
            {
              params: { start_date: startDate, end_date: endDate },
            }
          );
          setPlans(response.data.data);
        } else {
          const dateStr = formatDate(selectedFullDate);
          const response = await apiClient.get<ApiResponse<PlanningItem[]>>(
            "/planning",
            {
              params: { date: dateStr },
            }
          );
          setPlans(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        setPlans([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedFullDate, activeView, selectedWeekDays]
  );

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Refresh data when screen regains focus (after returning from create/edit)
  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [fetchPlans])
  );

  const handleRefresh = useCallback(() => {
    fetchPlans(true);
  }, [fetchPlans]);

  // Compute status counts for the day summary
  const statusCounts = useMemo(() => {
    const counts = { completed: 0, in_progress: 0, planned: 0 };
    plans.forEach((plan) => {
      const status = getPlanStatus(plan);
      counts[status]++;
    });
    return counts;
  }, [plans]);

  // Apply filter and search to plans
  const filteredPlans = useMemo(() => {
    let result = plans;

    // Apply status filter
    const filterStatus = FILTER_TO_STATUS[activeFilter];
    if (filterStatus) {
      result = result.filter((plan) => getPlanStatus(plan) === filterStatus);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((plan) => {
        const name = (plan.description ?? plan.profile?.name ?? "").toLowerCase();
        const device = (plan.device?.name ?? "").toLowerCase();
        return name.includes(query) || device.includes(query);
      });
    }

    return result;
  }, [plans, activeFilter, searchQuery]);

  // Group plans by day for Week view
  const plansByDay = useMemo(() => {
    if (activeView !== "Week") return {};
    const grouped: Record<string, PlanningItem[]> = {};
    filteredPlans.forEach((plan) => {
      const dateKey = plan.planned_at.split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(plan);
    });
    return grouped;
  }, [filteredPlans, activeView]);

  // Determine which days have roasts (for dot indicators)
  const selectedDayHasRoasts = plans.length > 0;

  return (
    <View style={styles.container}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Planning</Text>
            <Text style={styles.headerSubtitle}>Roast Schedule</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, showFilter && styles.headerButtonActive]}
            activeOpacity={0.6}
            onPress={() => {
              setShowFilter((prev) => !prev);
              setShowSearch(false);
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
                stroke={showFilter ? Colors.safety : "#fff"}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, showSearch && styles.headerButtonActive]}
            activeOpacity={0.6}
            onPress={() => {
              setShowSearch((prev) => !prev);
              setShowFilter(false);
              if (showSearch) {
                setSearchQuery("");
              }
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
                stroke={showSearch ? Colors.safety : "#fff"}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter bar */}
      {showFilter && (
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarContent}
          >
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterChip,
                  activeFilter === option && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(option)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === option && styles.filterChipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
              stroke={Colors.textTertiary}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Search plans..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={Colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Date strip */}
      {activeView !== "List" && (
      <ScrollView
        ref={dateStripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContainer}
        style={styles.dateStripScroll}
        onLayout={scrollToToday}
      >
        {dateStripItems.map((item) => {
          if (item.type === "separator") {
            return (
              <View key={item.key} style={styles.weekSeparator}>
                <View style={styles.weekSeparatorLine} />
                <Text style={styles.weekSeparatorText}>{item.label}</Text>
              </View>
            );
          }

          const isSelected = item.key === currentSelectedKey;
          const hasDot = isSelected && selectedDayHasRoasts;

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.dateItem,
                item.isToday && !isSelected && styles.dateItemToday,
                isSelected && styles.dateItemSelected,
              ]}
              onPress={() => setSelectedKey(item.key)}
              activeOpacity={0.7}
              onLayout={
                item.isToday
                  ? (e) => { todayOffsetRef.current = e.nativeEvent.layout.x; }
                  : undefined
              }
            >
              <Text
                style={[
                  styles.dateLabel,
                  isSelected && styles.dateLabelSelected,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.dateNumber,
                  isSelected && styles.dateNumberSelected,
                ]}
              >
                {item.date}
              </Text>
              {hasDot ? (
                <View
                  style={[
                    styles.dateDot,
                    {
                      backgroundColor: isSelected
                        ? Colors.safety
                        : Colors.sky,
                    },
                  ]}
                />
              ) : (
                <View style={styles.dateDotPlaceholder} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}

      {/* View toggle */}
      <View style={styles.viewToggleContainer}>
        {VIEW_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.viewTogglePill,
              activeView === option && styles.viewTogglePillActive,
            ]}
            onPress={() => setActiveView(option)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.viewToggleText,
                activeView === option && styles.viewToggleTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Day summary row */}
      {activeView === "Day" && (
        <View style={styles.daySummaryRow}>
          <Text style={styles.daySummaryLabel}>
            {dayName} {"\u00B7"} {filteredPlans.length} roast
            {filteredPlans.length !== 1 ? "s" : ""}
          </Text>
          <View style={styles.daySummaryCounts}>
            {statusCounts.completed > 0 && (
              <View style={styles.daySummaryCountItem}>
                <View
                  style={[
                    styles.daySummaryDot,
                    { backgroundColor: Colors.leaf },
                  ]}
                />
                <Text style={styles.daySummaryCountText}>
                  {statusCounts.completed}
                </Text>
              </View>
            )}
            {statusCounts.in_progress > 0 && (
              <View style={styles.daySummaryCountItem}>
                <View
                  style={[
                    styles.daySummaryDot,
                    { backgroundColor: Colors.boven },
                  ]}
                />
                <Text style={styles.daySummaryCountText}>
                  {statusCounts.in_progress}
                </Text>
              </View>
            )}
            {statusCounts.planned > 0 && (
              <View style={styles.daySummaryCountItem}>
                <View
                  style={[
                    styles.daySummaryDot,
                    { backgroundColor: Colors.sky },
                  ]}
                />
                <Text style={styles.daySummaryCountText}>
                  {statusCounts.planned}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Week summary */}
      {activeView === "Week" && (
        <View style={styles.daySummaryRow}>
          <Text style={styles.daySummaryLabel}>
            This Week {"\u00B7"} {filteredPlans.length} roast
            {filteredPlans.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* List summary */}
      {activeView === "List" && (
        <View style={styles.daySummaryRow}>
          <Text style={styles.daySummaryLabel}>
            All Plans {"\u00B7"} {filteredPlans.length} roast
            {filteredPlans.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Plan cards */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      ) : (
        <ScrollView
          style={styles.plansScroll}
          contentContainerStyle={styles.plansContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.slate}
            />
          }
        >
          {filteredPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.emptyText}>
                {activeFilter !== "All" || searchQuery
                  ? "No matching plans found."
                  : "No plans for this day."}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilter !== "All" || searchQuery
                  ? "Try adjusting your filters"
                  : "Tap + to schedule a roast"}
              </Text>
            </View>
          ) : activeView === "Week" ? (
            selectedWeekDays.map((day) => {
              const dateKey = formatDate(day.fullDate);
              const dayPlans = plansByDay[dateKey] ?? [];
              if (dayPlans.length === 0) return null;
              return (
                <View key={dateKey} style={styles.weekDayGroup}>
                  <View style={styles.weekDayHeader}>
                    <Text style={styles.weekDayLabel}>
                      {FULL_DAY_NAMES[day.fullDate.getDay()]}
                    </Text>
                    <Text style={styles.weekDayDate}>
                      {day.fullDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                    <View style={styles.weekDayCountBadge}>
                      <Text style={styles.weekDayCount}>{dayPlans.length}</Text>
                    </View>
                  </View>
                  {dayPlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} onPress={() => router.push(`/planning/${plan.id}`)} />
                  ))}
                </View>
              );
            })
          ) : (
            filteredPlans.map((plan) => <PlanCard key={plan.id} plan={plan} onPress={() => router.push(`/planning/${plan.id}`)} />)
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push("/planning/create")}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* ── Header ── */
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
  headerButtonActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  /* ── Filter Bar ── */
  filterBar: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.gravelLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  filterChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },

  /* ── Search Bar ── */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },

  /* ── Date Strip ── */
  dateStripScroll: {
    flexGrow: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  dateStripContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "flex-end",
  },
  weekSeparator: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    height: 62,
  },
  weekSeparatorLine: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  weekSeparatorText: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateItem: {
    width: 48,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateItemToday: {
    borderColor: Colors.safety,
    borderWidth: 1.5,
  },
  dateItemSelected: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  dateLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  dateLabelSelected: {
    color: "rgba(255,255,255,0.6)",
  },
  dateNumber: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 18,
    color: Colors.text,
    lineHeight: 22,
  },
  dateNumberSelected: {
    color: Colors.safety,
  },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
  },
  dateDotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 5,
  },

  /* ── View Toggle ── */
  viewToggleContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  viewTogglePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  viewTogglePillActive: {
    backgroundColor: Colors.slate,
  },
  viewToggleText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  viewToggleTextActive: {
    color: Colors.card,
  },

  /* ── Day Summary ── */
  daySummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  daySummaryLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  daySummaryCounts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  daySummaryCountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  daySummaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  daySummaryCountText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* ── Plan Cards ── */
  plansScroll: {
    flex: 1,
  },
  plansContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  planCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  planCardBorder: {
    width: 3,
  },
  timeStrip: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  timeStripTime: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
  },
  timeStripPeriod: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  planCardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  planCardName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },
  planCardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaDataText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* ── Profile Bar ── */
  profileBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gravelLight,
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  profileBarText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },

  /* ── Week View ── */
  weekDayGroup: {
    gap: 10,
    marginBottom: 16,
  },
  weekDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  weekDayLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  weekDayDate: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  weekDayCountBadge: {
    backgroundColor: Colors.gravelLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  weekDayCount: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },

  /* ── Empty / Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: "DMSans-Medium",
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptySubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },

  /* ── FAB ── */
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.safety,
    lineHeight: 30,
    fontWeight: "300",
  },
});
