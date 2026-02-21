import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line, Text as SvgText, G, Rect } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { ProfilerProfileDetail, ProfileRecentRoast } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRoastTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (diffDays === 0) {
    return `Today, ${hours}:${minutes}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${hours}:${minutes}`;
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[date.getDay()]}, ${hours}:${minutes}`;
}

function formatTimeAxis(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Types for curve data                                                */
/* ------------------------------------------------------------------ */

interface CurvePoint {
  time: number;
  value: number;
}

interface CurveData {
  bean_temp: CurvePoint[];
  drum_temp: CurvePoint[];
  ror: CurvePoint[];
}

/* ------------------------------------------------------------------ */
/*  SVG Reference Curve Chart                                           */
/* ------------------------------------------------------------------ */

const CHART_COLORS = {
  beanTemp: Colors.sky,
  drumTemp: Colors.boven,
  ror: Colors.grape,
};

interface ReferenceCurveChartProps {
  curveData: CurveData;
  duration: number;
}

function ReferenceCurveChart({ curveData, duration }: ReferenceCurveChartProps) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 40;
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 32;
  const rorAxisWidth = 36;

  const plotWidth = chartWidth - paddingLeft - paddingRight - rorAxisWidth;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const { beanTemp, drumTemp, ror } = useMemo(() => {
    return {
      beanTemp: curveData.bean_temp ?? [],
      drumTemp: curveData.drum_temp ?? [],
      ror: curveData.ror ?? [],
    };
  }, [curveData]);

  const { tempMin, tempMax, rorMin, rorMax, timeMax } = useMemo(() => {
    const allTempValues = [
      ...beanTemp.map((p) => p.value),
      ...drumTemp.map((p) => p.value),
    ].filter((v) => v !== undefined && v !== null && !isNaN(v));

    const allRorValues = ror
      .map((p) => p.value)
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    const allTimes = [
      ...beanTemp.map((p) => p.time),
      ...drumTemp.map((p) => p.time),
      ...ror.map((p) => p.time),
    ];

    const tMin = allTempValues.length > 0 ? Math.min(...allTempValues) : 0;
    const tMax = allTempValues.length > 0 ? Math.max(...allTempValues) : 250;
    const rMin = allRorValues.length > 0 ? Math.min(...allRorValues) : 0;
    const rMax = allRorValues.length > 0 ? Math.max(...allRorValues) : 30;
    const maxTime = allTimes.length > 0 ? Math.max(...allTimes) : (duration ?? 600);

    const tempMargin = (tMax - tMin) * 0.1 || 10;
    const rorMargin = (rMax - rMin) * 0.15 || 5;

    return {
      tempMin: Math.max(0, Math.floor((tMin - tempMargin) / 10) * 10),
      tempMax: Math.ceil((tMax + tempMargin) / 10) * 10,
      rorMin: Math.max(0, Math.floor(rMin - rorMargin)),
      rorMax: Math.ceil(rMax + rorMargin),
      timeMax: maxTime,
    };
  }, [beanTemp, drumTemp, ror, duration]);

  const mapX = useCallback(
    (time: number) => paddingLeft + (time / timeMax) * plotWidth,
    [timeMax, plotWidth]
  );

  const mapTempY = useCallback(
    (value: number) => {
      const range = tempMax - tempMin || 1;
      return paddingTop + plotHeight - ((value - tempMin) / range) * plotHeight;
    },
    [tempMin, tempMax, plotHeight]
  );

  const mapRorY = useCallback(
    (value: number) => {
      const range = rorMax - rorMin || 1;
      return paddingTop + plotHeight - ((value - rorMin) / range) * plotHeight;
    },
    [rorMin, rorMax, plotHeight]
  );

  const buildSmoothPath = useCallback(
    (points: CurvePoint[], mapY: (value: number) => number): string => {
      const filtered = points.filter(
        (p) => p.value !== undefined && p.value !== null && !isNaN(p.value)
      );
      if (filtered.length < 2) return "";

      let d = `M ${mapX(filtered[0].time)} ${mapY(filtered[0].value)}`;

      for (let i = 1; i < filtered.length; i++) {
        const x0 = mapX(filtered[i - 1].time);
        const y0 = mapY(filtered[i - 1].value);
        const x1 = mapX(filtered[i].time);
        const y1 = mapY(filtered[i].value);
        const cx = (x0 + x1) / 2;

        d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
      }

      return d;
    },
    [mapX]
  );

  const tempGridLines = useMemo(() => {
    const lines: number[] = [];
    const step = Math.max(Math.round((tempMax - tempMin) / 5 / 10) * 10, 10);
    for (let v = tempMin; v <= tempMax; v += step) {
      lines.push(v);
    }
    return lines;
  }, [tempMin, tempMax]);

  const timeGridLines = useMemo(() => {
    const lines: number[] = [];
    const step = Math.max(Math.round(timeMax / 5 / 60) * 60, 60);
    for (let t = 0; t <= timeMax; t += step) {
      lines.push(t);
    }
    return lines;
  }, [timeMax]);

  const beanTempPath = buildSmoothPath(beanTemp, mapTempY);
  const drumTempPath = buildSmoothPath(drumTemp, mapTempY);
  const rorPath = buildSmoothPath(ror, mapRorY);

  return (
    <View style={chartStyles.container}>
      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View
            style={[chartStyles.legendDot, { backgroundColor: CHART_COLORS.beanTemp }]}
          />
          <Text style={chartStyles.legendText}>Bean Temp</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View
            style={[chartStyles.legendDot, { backgroundColor: CHART_COLORS.drumTemp }]}
          />
          <Text style={chartStyles.legendText}>Drum Temp</Text>
        </View>
        {ror.length > 0 ? (
          <View style={chartStyles.legendItem}>
            <View
              style={[chartStyles.legendDot, { backgroundColor: CHART_COLORS.ror }]}
            />
            <Text style={chartStyles.legendText}>RoR</Text>
          </View>
        ) : null}
      </View>

      {/* SVG Chart */}
      <Svg width={chartWidth} height={chartHeight}>
        <Rect
          x={paddingLeft}
          y={paddingTop}
          width={plotWidth}
          height={plotHeight}
          fill="#fafaf8"
          rx={4}
        />

        {/* Horizontal gridlines */}
        {tempGridLines.map((val) => (
          <G key={`hgrid-${val}`}>
            <Line
              x1={paddingLeft}
              y1={mapTempY(val)}
              x2={paddingLeft + plotWidth}
              y2={mapTempY(val)}
              stroke={Colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 3"
            />
            <SvgText
              x={paddingLeft - 6}
              y={mapTempY(val) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={Colors.textTertiary}
              textAnchor="end"
            >
              {String(val)}
            </SvgText>
          </G>
        ))}

        {/* Vertical gridlines */}
        {timeGridLines.map((val) => (
          <G key={`vgrid-${val}`}>
            <Line
              x1={mapX(val)}
              y1={paddingTop}
              x2={mapX(val)}
              y2={paddingTop + plotHeight}
              stroke={Colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 3"
            />
            <SvgText
              x={mapX(val)}
              y={paddingTop + plotHeight + 14}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={Colors.textTertiary}
              textAnchor="middle"
            >
              {formatTimeAxis(val)}
            </SvgText>
          </G>
        ))}

        {/* RoR axis labels */}
        {ror.length > 0 ? (
          <G>
            <SvgText
              x={paddingLeft + plotWidth + 6}
              y={mapRorY(rorMax) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={CHART_COLORS.ror}
              textAnchor="start"
            >
              {String(Math.round(rorMax))}
            </SvgText>
            <SvgText
              x={paddingLeft + plotWidth + 6}
              y={mapRorY(rorMin) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={CHART_COLORS.ror}
              textAnchor="start"
            >
              {String(Math.round(rorMin))}
            </SvgText>
            <SvgText
              x={paddingLeft + plotWidth + 6}
              y={mapRorY((rorMax + rorMin) / 2) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={CHART_COLORS.ror}
              textAnchor="start"
            >
              {String(Math.round((rorMax + rorMin) / 2))}
            </SvgText>
          </G>
        ) : null}

        {/* Plot border */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={paddingLeft + plotWidth}
          y2={paddingTop + plotHeight}
          stroke={Colors.border}
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + plotHeight}
          stroke={Colors.border}
          strokeWidth={1}
        />

        {/* RoR line */}
        {rorPath.length > 0 ? (
          <Path
            d={rorPath}
            stroke={CHART_COLORS.ror}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            opacity={0.7}
          />
        ) : null}

        {/* Drum temp line */}
        {drumTempPath.length > 0 ? (
          <Path
            d={drumTempPath}
            stroke={CHART_COLORS.drumTemp}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}

        {/* Bean temp line */}
        {beanTempPath.length > 0 ? (
          <Path
            d={beanTempPath}
            stroke={CHART_COLORS.beanTemp}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

/* ------------------------------------------------------------------ */
/*  Stat Card Component                                                 */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}

function StatCard({ label, value, unit, color }: StatCardProps) {
  return (
    <View style={detailStyles.statCard}>
      <Text style={detailStyles.statLabel}>{label}</Text>
      <View style={detailStyles.statValueRow}>
        <Text style={[detailStyles.statValue, color ? { color } : undefined]}>
          {value}
        </Text>
        {unit ? <Text style={detailStyles.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Roast Card                                                   */
/* ------------------------------------------------------------------ */

interface RecentRoastCardProps {
  roast: ProfileRecentRoast;
}

function RecentRoastCard({ roast }: RecentRoastCardProps) {
  return (
    <View style={detailStyles.recentRoastCard}>
      <View style={detailStyles.recentRoastLeft}>
        <Text style={detailStyles.recentRoastName} numberOfLines={1}>
          {roast.bean_type ?? roast.profile_name}
        </Text>
        <Text style={detailStyles.recentRoastMeta}>
          {roast.device_name} {"\u00B7"} {formatRoastTime(roast.roasted_at)}
        </Text>
      </View>
      <View style={detailStyles.recentRoastRight}>
        <Text style={detailStyles.recentRoastDuration}>
          {formatDuration(roast.duration)}
        </Text>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18l6-6-6-6"
            stroke={Colors.textTertiary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfilerProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get<{ data: ProfilerProfileDetail }>(
        `/profiles/${id}`
      );
      setProfile(response.data.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Failed to load profile details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  /* -- Loading State -- */
  if (loading) {
    return (
      <View style={detailStyles.screen}>
        <View style={[detailStyles.header, { paddingTop: insets.top + 12 }]}>
          <View style={detailStyles.headerContent}>
            <View style={detailStyles.headerLeft}>
              <TouchableOpacity
                style={detailStyles.backButton}
                activeOpacity={0.7}
                onPress={() => router.back()}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <View style={detailStyles.logoBox}>
                <GiesenLogo size={18} color={Colors.text} />
              </View>
              <View>
                <Text style={detailStyles.headerTitle}>Profile</Text>
                <Text style={detailStyles.headerSubtitle}>Details</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={detailStyles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  /* -- Error State -- */
  if (error || !profile) {
    return (
      <View style={detailStyles.screen}>
        <View style={[detailStyles.header, { paddingTop: insets.top + 12 }]}>
          <View style={detailStyles.headerContent}>
            <View style={detailStyles.headerLeft}>
              <TouchableOpacity
                style={detailStyles.backButton}
                activeOpacity={0.7}
                onPress={() => router.back()}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <View style={detailStyles.logoBox}>
                <GiesenLogo size={18} color={Colors.text} />
              </View>
              <View>
                <Text style={detailStyles.headerTitle}>Profile</Text>
                <Text style={detailStyles.headerSubtitle}>Details</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={detailStyles.errorContainer}>
          <Text style={detailStyles.errorText}>
            {error ?? "Profile not found."}
          </Text>
          <TouchableOpacity
            style={detailStyles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={detailStyles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={detailStyles.screen}>
      {/* Header */}
      <View style={[detailStyles.header, { paddingTop: insets.top + 12 }]}>
        <View style={detailStyles.headerContent}>
          <View style={detailStyles.headerLeft}>
            <TouchableOpacity
              style={detailStyles.backButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M12 19l-7-7 7-7"
                  stroke="#fff"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <View style={detailStyles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.headerTitle} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={detailStyles.headerSubtitle}>
                {profile.roaster_model ?? "Profile"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={detailStyles.scrollView}
        contentContainerStyle={detailStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* Reference Curve Chart */}
        <View style={detailStyles.card}>
          <View style={detailStyles.cardHeader}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke={Colors.grape}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={detailStyles.cardTitle}>Reference Curve</Text>
          </View>
          {profile.curve_data ? (
            <ReferenceCurveChart
              curveData={profile.curve_data}
              duration={profile.duration ?? 600}
            />
          ) : (
            <View style={detailStyles.emptyCurve}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M22 12h-4l-3 9L9 3l-3 9H2"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.emptyCurveText}>
                No reference curve available
              </Text>
              <Text style={detailStyles.emptyCurveSubtext}>
                This profile does not have recorded curve data.
              </Text>
            </View>
          )}
        </View>

        {/* Key Metrics Row */}
        <View style={detailStyles.metricsRow}>
          <StatCard
            label="DURATION"
            value={formatDuration(profile.duration)}
            color={Colors.text}
          />
          <StatCard
            label="START WEIGHT"
            value={
              profile.start_weight !== null
                ? profile.start_weight.toFixed(1)
                : "-"
            }
            unit={profile.start_weight !== null ? " kg" : ""}
          />
          <StatCard
            label="ROASTS"
            value={String(profile.roasts_count)}
            color={Colors.grape}
          />
        </View>

        <View style={detailStyles.metricsRow}>
          <StatCard
            label="END WEIGHT"
            value={
              profile.end_weight !== null
                ? profile.end_weight.toFixed(1)
                : "-"
            }
            unit={profile.end_weight !== null ? " kg" : ""}
          />
          <StatCard
            label="WEIGHT LOSS"
            value={
              profile.weight_change !== null
                ? Math.abs(profile.weight_change).toFixed(1)
                : "-"
            }
            unit={profile.weight_change !== null ? "%" : ""}
            color={Colors.boven}
          />
        </View>

        {/* Profile Info Card */}
        <View style={detailStyles.card}>
          <View style={detailStyles.cardHeader}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 20V10M18 20V4M6 20v-4"
                stroke={Colors.grape}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={detailStyles.cardTitle}>Profile Info</Text>
          </View>

          <View style={detailStyles.detailRow}>
            <Text style={detailStyles.detailLabel}>Name</Text>
            <Text style={detailStyles.detailValue}>{profile.name}</Text>
          </View>

          {profile.roaster_model ? (
            <>
              <View style={detailStyles.detailDivider} />
              <View style={detailStyles.detailRow}>
                <Text style={detailStyles.detailLabel}>Roaster Model</Text>
                <Text style={detailStyles.detailValue}>
                  {profile.roaster_model}
                </Text>
              </View>
            </>
          ) : null}

          {profile.bean_type ? (
            <>
              <View style={detailStyles.detailDivider} />
              <View style={detailStyles.detailRow}>
                <Text style={detailStyles.detailLabel}>Bean Type</Text>
                <Text style={detailStyles.detailValue}>
                  {profile.bean_type}
                </Text>
              </View>
            </>
          ) : null}

          {profile.type ? (
            <>
              <View style={detailStyles.detailDivider} />
              <View style={detailStyles.detailRow}>
                <Text style={detailStyles.detailLabel}>Type</Text>
                <Text style={detailStyles.detailValue}>{profile.type}</Text>
              </View>
            </>
          ) : null}

          <View style={detailStyles.detailDivider} />
          <View style={detailStyles.detailRow}>
            <Text style={detailStyles.detailLabel}>Created</Text>
            <Text style={detailStyles.detailValue}>
              {formatDate(profile.created_at)}
            </Text>
          </View>

          {profile.is_favorite ? (
            <>
              <View style={detailStyles.detailDivider} />
              <View style={detailStyles.detailRow}>
                <Text style={detailStyles.detailLabel}>Favorite</Text>
                <View style={detailStyles.favBadge}>
                  <Text style={detailStyles.favStar}>{"\u2605"}</Text>
                  <Text style={detailStyles.favText}>Yes</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Comment Card */}
        {profile.comment ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  stroke={Colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Comment</Text>
            </View>
            <Text style={detailStyles.commentText}>{profile.comment}</Text>
          </View>
        ) : null}

        {/* Recent Roasts Section */}
        <View style={detailStyles.card}>
          <View style={detailStyles.cardHeader}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"
                stroke={Colors.sky}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={detailStyles.cardTitle}>Recent Roasts</Text>
            <Text style={detailStyles.cardCount}>
              {profile.recent_roasts.length}
            </Text>
          </View>
          {profile.recent_roasts.length > 0 ? (
            <View style={detailStyles.recentRoastsList}>
              {profile.recent_roasts.map((roast, index) => (
                <TouchableOpacity
                  key={roast.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/roasts/${roast.id}`)}
                >
                  <RecentRoastCard roast={roast} />
                  {index < profile.recent_roasts.length - 1 ? (
                    <View style={detailStyles.recentRoastDivider} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={detailStyles.emptyRoasts}>
              <Text style={detailStyles.emptyRoastsText}>
                No roasts yet for this profile.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const detailStyles = StyleSheet.create({
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
    fontSize: 20,
    color: "#ffffff",
  },
  headerSubtitle: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },

  /* -- Loading / Error -- */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
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
    padding: 20,
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  cardCount: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* -- Empty Curve -- */
  emptyCurve: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyCurveText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptyCurveSubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
  },

  /* -- Metrics Row -- */
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  statLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 18,
    color: Colors.text,
    lineHeight: 22,
  },
  statUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },

  /* -- Detail Rows -- */
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },

  /* -- Favorite -- */
  favBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.sunBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  favStar: {
    fontSize: 12,
    color: Colors.sun,
  },
  favText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.sun,
  },

  /* -- Comment -- */
  commentText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  /* -- Recent Roasts -- */
  recentRoastsList: {
    gap: 0,
  },
  recentRoastCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  recentRoastLeft: {
    flex: 1,
    gap: 4,
  },
  recentRoastName: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  recentRoastMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recentRoastRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recentRoastDuration: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  recentRoastDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  emptyRoasts: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyRoastsText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
