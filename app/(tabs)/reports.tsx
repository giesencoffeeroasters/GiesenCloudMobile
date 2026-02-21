import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface DailyBreakdown {
  date: string;
  roast_count: number;
  total_weight: number;
}

interface TopProfile {
  profile_name: string;
  roast_count: number;
  total_weight: number;
}

interface ProductionData {
  total_roasts: number;
  total_weight_kg: number;
  avg_duration: number | null;
  daily_breakdown: DailyBreakdown[];
  top_profiles: TopProfile[];
}

interface ScoreRange {
  range: string;
  count: number;
}

interface QualityData {
  avg_cupping_score: number | null;
  total_sessions: number;
  total_samples: number;
  score_distribution: ScoreRange[];
}

interface ByType {
  type_name: string;
  count: number;
  total_weight: number;
}

interface InventoryData {
  total_items: number;
  total_weight_kg: number;
  low_stock_items: number;
  by_type: ByType[];
}

type ReportTab = "production" | "quality" | "inventory";

/* ------------------------------------------------------------------ */
/*  Date helpers                                                        */
/* ------------------------------------------------------------------ */

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/* ------------------------------------------------------------------ */
/*  SVG Bar Chart - Vertical (for daily production)                     */
/* ------------------------------------------------------------------ */

function VerticalBarChart({
  data,
  width,
}: {
  data: DailyBreakdown[];
  width: number;
}) {
  if (!data.length) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>No data for this period</Text>
      </View>
    );
  }

  const chartWidth = width - 32;
  const chartHeight = 180;
  const leftPadding = 36;
  const bottomPadding = 40;
  const rightPadding = 8;
  const topPadding = 16;

  const drawWidth = chartWidth - leftPadding - rightPadding;
  const drawHeight = chartHeight - topPadding - bottomPadding;

  const maxVal = Math.max(...data.map((d) => d.roast_count), 1);
  const barWidth = Math.max(4, Math.min(24, drawWidth / data.length - 3));
  const gap = (drawWidth - barWidth * data.length) / Math.max(data.length - 1, 1);

  // Y-axis ticks
  const tickCount = 4;
  const tickStep = Math.ceil(maxVal / tickCount);

  // Only show every Nth label on X-axis to avoid overlap
  const maxLabels = Math.floor(drawWidth / 36);
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {/* Y-axis grid lines and labels */}
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const val = i * tickStep;
        const y = topPadding + drawHeight - (val / (tickStep * tickCount)) * drawHeight;
        return (
          <G key={`y-${i}`}>
            <Line
              x1={leftPadding}
              y1={y}
              x2={chartWidth - rightPadding}
              y2={y}
              stroke={Colors.border}
              strokeWidth={0.5}
            />
            <SvgText
              x={leftPadding - 6}
              y={y + 4}
              fontSize={9}
              fill={Colors.textTertiary}
              textAnchor="end"
              fontFamily="JetBrainsMono-Regular"
            >
              {String(val)}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {data.map((item, i) => {
        const barH = (item.roast_count / (tickStep * tickCount)) * drawHeight;
        const x = leftPadding + i * (barWidth + gap);
        const y = topPadding + drawHeight - barH;
        return (
          <G key={`bar-${i}`}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 1)}
              rx={2}
              fill={Colors.sky}
              opacity={0.85}
            />
            {/* X-axis label */}
            {i % labelStep === 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 6}
                fontSize={8}
                fill={Colors.textTertiary}
                textAnchor="middle"
                fontFamily="JetBrainsMono-Regular"
                transform={`rotate(-30, ${x + barWidth / 2}, ${chartHeight - 6})`}
              >
                {formatDateLabel(item.date)}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SVG Bar Chart - Horizontal (for score distribution)                 */
/* ------------------------------------------------------------------ */

const SCORE_COLORS: Record<string, string> = {
  "90-100": Colors.leaf,
  "85-89": Colors.sky,
  "80-84": Colors.sun,
  "70-79": Colors.boven,
  "<70": Colors.traffic,
};

function HorizontalBarChart({
  data,
  width,
}: {
  data: ScoreRange[];
  width: number;
}) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>No score data available</Text>
      </View>
    );
  }

  const chartWidth = width - 32;
  const barHeight = 22;
  const barGap = 8;
  const labelWidth = 52;
  const countWidth = 30;
  const chartHeight = data.length * (barHeight + barGap) + 8;
  const drawWidth = chartWidth - labelWidth - countWidth - 12;

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {data.map((item, i) => {
        const y = i * (barHeight + barGap) + 4;
        const barW = (item.count / maxVal) * drawWidth;
        const color = SCORE_COLORS[item.range] ?? Colors.sky;

        return (
          <G key={`hbar-${i}`}>
            {/* Range label */}
            <SvgText
              x={0}
              y={y + barHeight / 2 + 4}
              fontSize={10}
              fill={Colors.textSecondary}
              fontFamily="JetBrainsMono-Regular"
            >
              {item.range}
            </SvgText>

            {/* Bar background */}
            <Rect
              x={labelWidth}
              y={y}
              width={drawWidth}
              height={barHeight}
              rx={4}
              fill={Colors.border}
              opacity={0.3}
            />

            {/* Bar fill */}
            <Rect
              x={labelWidth}
              y={y}
              width={Math.max(barW, 2)}
              height={barHeight}
              rx={4}
              fill={color}
              opacity={0.8}
            />

            {/* Count label */}
            <SvgText
              x={labelWidth + drawWidth + 8}
              y={y + barHeight / 2 + 4}
              fontSize={10}
              fill={Colors.text}
              fontFamily="JetBrainsMono-Medium"
            >
              {String(item.count)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card Component                                                 */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                     */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "60%" }]} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;

  const [activeTab, setActiveTab] = useState<ReportTab>("production");
  const [startDate, setStartDate] = useState(() => daysAgo(30));
  const [endDate, setEndDate] = useState(() => new Date());

  const [productionData, setProductionData] = useState<ProductionData | null>(null);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          start_date: formatDateParam(startDate),
          end_date: formatDateParam(endDate),
        };

        const response = await apiClient.get(`/reports/${activeTab}`, { params });
        const data = response.data.data;

        if (activeTab === "production") {
          setProductionData(data);
        } else if (activeTab === "quality") {
          setQualityData(data);
        } else {
          setInventoryData(data);
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.message ??
          "Could not load report data. Please try again.";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, startDate, endDate]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "production", label: "Production" },
    { key: "quality", label: "Quality" },
    { key: "inventory", label: "Inventory" },
  ];

  /* Date range presets */
  function applyPreset(days: number) {
    setStartDate(daysAgo(days));
    setEndDate(new Date());
  }

  return (
    <View style={styles.screen}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Reports</Text>
              <Text style={styles.headerSubtitle}>Analytics & insights</Text>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchReport(true)}
            tintColor={Colors.safety}
          />
        }
      >
        {/* Date range presets */}
        <View style={styles.dateBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateBarContent}
          >
            {[
              { label: "7 days", days: 7 },
              { label: "30 days", days: 30 },
              { label: "90 days", days: 90 },
              { label: "This year", days: -1 },
            ].map((preset) => {
              const isActive =
                preset.days === -1
                  ? startDate.getMonth() === 0 &&
                    startDate.getDate() === 1 &&
                    startDate.getFullYear() === new Date().getFullYear()
                  : Math.round(
                      (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) === preset.days;

              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.dateChip,
                    isActive && styles.dateChipActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (preset.days === -1) {
                      const jan1 = new Date(new Date().getFullYear(), 0, 1);
                      setStartDate(jan1);
                      setEndDate(new Date());
                    } else {
                      applyPreset(preset.days);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      isActive && styles.dateChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.dateRange}>
            {formatDateLabel(formatDateParam(startDate))} -{" "}
            {formatDateLabel(formatDateParam(endDate))}
          </Text>
        </View>

        {/* Error state */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchReport()}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonRow}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        )}

        {/* Production Report */}
        {!loading && !error && activeTab === "production" && productionData && (
          <View>
            <View style={styles.statsRow}>
              <StatCard
                label="Total Roasts"
                value={String(productionData.total_roasts)}
                color={Colors.sky}
              />
              <StatCard
                label="Total Weight"
                value={`${productionData.total_weight_kg.toFixed(1)} kg`}
                color={Colors.leaf}
              />
              <StatCard
                label="Avg Duration"
                value={formatDuration(productionData.avg_duration)}
                color={Colors.sun}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Daily Roast Count</Text>
              <VerticalBarChart
                data={productionData.daily_breakdown}
                width={screenWidth}
              />
            </View>

            <View style={styles.listCard}>
              <Text style={styles.chartTitle}>Top Profiles</Text>
              {productionData.top_profiles.length === 0 ? (
                <Text style={styles.emptyListText}>
                  No profiles used in this period
                </Text>
              ) : (
                productionData.top_profiles.map((profile, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.listRow,
                      idx === productionData.top_profiles.length - 1 &&
                        styles.listRowLast,
                    ]}
                  >
                    <View style={styles.listRowLeft}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.listRowLabel} numberOfLines={1}>
                        {profile.profile_name}
                      </Text>
                    </View>
                    <View style={styles.listRowRight}>
                      <Text style={styles.listRowValue}>
                        {profile.roast_count} roasts
                      </Text>
                      <Text style={styles.listRowSub}>
                        {(profile.total_weight / 1000).toFixed(1)} kg
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Quality Report */}
        {!loading && !error && activeTab === "quality" && qualityData && (
          <View>
            <View style={styles.statsRow}>
              <StatCard
                label="Avg Score"
                value={
                  qualityData.avg_cupping_score !== null
                    ? String(qualityData.avg_cupping_score)
                    : "--"
                }
                color={Colors.leaf}
              />
              <StatCard
                label="Sessions"
                value={String(qualityData.total_sessions)}
                color={Colors.sky}
              />
              <StatCard
                label="Samples"
                value={String(qualityData.total_samples)}
                color={Colors.grape}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Score Distribution</Text>
              <HorizontalBarChart
                data={qualityData.score_distribution}
                width={screenWidth}
              />
            </View>
          </View>
        )}

        {/* Inventory Report */}
        {!loading && !error && activeTab === "inventory" && inventoryData && (
          <View>
            <View style={styles.statsRow}>
              <StatCard
                label="Total Items"
                value={String(inventoryData.total_items)}
                color={Colors.sky}
              />
              <StatCard
                label="Total Weight"
                value={`${inventoryData.total_weight_kg.toFixed(1)} kg`}
                color={Colors.leaf}
              />
              <StatCard
                label="Low Stock"
                value={String(inventoryData.low_stock_items)}
                color={
                  inventoryData.low_stock_items > 0
                    ? Colors.traffic
                    : Colors.textTertiary
                }
              />
            </View>

            <View style={styles.listCard}>
              <Text style={styles.chartTitle}>By Type</Text>
              {inventoryData.by_type.length === 0 ? (
                <Text style={styles.emptyListText}>
                  No inventory items found
                </Text>
              ) : (
                inventoryData.by_type.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.listRow,
                      idx === inventoryData.by_type.length - 1 &&
                        styles.listRowLast,
                    ]}
                  >
                    <View style={styles.listRowLeft}>
                      <View
                        style={[
                          styles.typeDot,
                          {
                            backgroundColor: [
                              Colors.sky,
                              Colors.leaf,
                              Colors.sun,
                              Colors.grape,
                              Colors.boven,
                            ][idx % 5],
                          },
                        ]}
                      />
                      <Text style={styles.listRowLabel} numberOfLines={1}>
                        {item.type_name}
                      </Text>
                    </View>
                    <View style={styles.listRowRight}>
                      <Text style={styles.listRowValue}>
                        {item.count} items
                      </Text>
                      <Text style={styles.listRowSub}>
                        {item.total_weight.toFixed(1)} kg
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingBottom: 0,
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

  /* Tab bar */
  tabBar: {
    flexDirection: "row",
    marginTop: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.safety,
  },
  tabText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.gravel,
  },
  tabTextActive: {
    fontFamily: "DMSans-SemiBold",
    color: "#ffffff",
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Date bar */
  dateBar: {
    marginBottom: 16,
  },
  dateBarContent: {
    gap: 8,
    paddingRight: 16,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateChipActive: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  dateChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateChipTextActive: {
    color: Colors.safety,
  },
  dateRange: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 8,
  },

  /* Error */
  errorBox: {
    backgroundColor: Colors.trafficBg,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.traffic,
    textAlign: "center",
    marginBottom: 8,
  },
  retryText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.sky,
  },

  /* Stats row */
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "DMSans-Bold",
    fontSize: 18,
    color: Colors.text,
  },

  /* Chart card */
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  chartEmpty: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  chartEmptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },

  /* List card */
  listCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  listRowRight: {
    alignItems: "flex-end",
  },
  listRowLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  listRowValue: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
    color: Colors.text,
  },
  listRowSub: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyListText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: 20,
  },

  /* Rank badge */
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.skyBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 10,
    color: Colors.sky,
  },

  /* Type dot */
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* Skeleton */
  skeletonContainer: {
    gap: 12,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 4,
    width: "80%",
  },
});
