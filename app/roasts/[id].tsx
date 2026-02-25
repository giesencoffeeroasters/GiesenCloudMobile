import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { RoastCurveChart } from "@/components/charts/RoastCurveChart";
import apiClient from "@/api/client";
import type { RoastDetail, RoastPhase, CurvePoint } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number): string {
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreColor(score: number | null): {
  color: string;
  bg: string;
} {
  if (score === null) {
    return { color: Colors.textTertiary, bg: Colors.gravelLight };
  }
  if (score >= 90) {
    return { color: Colors.leaf, bg: Colors.leafBg };
  }
  if (score >= 85) {
    return { color: Colors.sky, bg: Colors.skyBg };
  }
  if (score >= 80) {
    return { color: Colors.sun, bg: Colors.sunBg };
  }
  return { color: Colors.boven, bg: Colors.bovenBg };
}

function findClosestReading(
  points: CurvePoint[],
  time: number
): number | null {
  if (!points || points.length === 0) return null;
  let closest = points[0];
  let minDiff = Math.abs(points[0].time - time);
  for (const p of points) {
    const diff = Math.abs(p.time - time);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest.value;
}

/* ------------------------------------------------------------------ */
/*  Phase Bar Component                                                 */
/* ------------------------------------------------------------------ */

function PhaseBar({
  phases,
  duration,
}: {
  phases: RoastPhase[];
  duration: number;
}) {
  if (phases.length === 0) return null;

  return (
    <View style={detailStyles.card}>
      <View style={detailStyles.cardHeader}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 3v18h18M7 16l4-8 4 4 4-8"
            stroke={Colors.boven}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={detailStyles.cardTitle}>Roast Phases</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          borderRadius: 6,
          overflow: "hidden",
          height: 28,
        }}
      >
        {phases.map((phase, i) => {
          const pct =
            ((phase.end_time - phase.start_time) / duration) * 100;
          return (
            <View
              key={i}
              style={{
                width: `${pct}%`,
                backgroundColor: phase.color || "#E8E8E3",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans-Medium",
                  fontSize: 9,
                  color: "#ffffff",
                }}
                numberOfLines={1}
              >
                {phase.name}
              </Text>
            </View>
          );
        })}
      </View>
      {/* Phase detail row below bar */}
      <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
        {phases.map((phase, i) => {
          const pct =
            ((phase.end_time - phase.start_time) / duration) * 100;
          const time = phase.end_time - phase.start_time;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: "JetBrainsMono-Medium",
                  fontSize: 11,
                  color: Colors.text,
                }}
              >
                {formatDuration(Math.round(time))}
              </Text>
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 10,
                  color: Colors.textTertiary,
                }}
              >
                {pct.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

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
        <Text
          style={[detailStyles.statValue, color ? { color } : undefined]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        {unit ? <Text style={detailStyles.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function RoastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [roast, setRoast] = useState<RoastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoast = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get<{ data: RoastDetail }>(
        `/roasts/${id}`
      );
      setRoast(response.data.data);
    } catch (err) {
      console.error("Failed to fetch roast:", err);
      setError("Failed to load roast details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoast();
  }, [fetchRoast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoast();
  }, [fetchRoast]);

  // Temperature metrics from curve data
  const startBeanTemp = useMemo(() => {
    if (!roast?.curve_data?.bean_temp?.length) return null;
    return roast.curve_data.bean_temp[0].value;
  }, [roast]);

  const endBeanTemp = useMemo(() => {
    if (!roast?.curve_data?.bean_temp?.length) return null;
    const points = roast.curve_data.bean_temp;
    return points[points.length - 1].value;
  }, [roast]);

  const endAirTemp = useMemo(() => {
    if (!roast?.curve_data?.drum_temp?.length) return null;
    const points = roast.curve_data.drum_temp;
    return points[points.length - 1].value;
  }, [roast]);

  // First crack event and development time
  const firstCrackEvent = useMemo(() => {
    if (!roast) return null;
    return roast.events.find((e) => e.type === "FIRST_CRACK") ?? null;
  }, [roast]);

  const firstCrackTemp = useMemo(() => {
    if (!firstCrackEvent || !roast?.curve_data?.bean_temp?.length) return null;
    return findClosestReading(
      roast.curve_data.bean_temp,
      firstCrackEvent.timePassed
    );
  }, [firstCrackEvent, roast]);

  const developmentTime = useMemo(() => {
    if (!firstCrackEvent || !roast) return null;
    return roast.duration - firstCrackEvent.timePassed;
  }, [firstCrackEvent, roast]);

  const developmentPct = useMemo(() => {
    if (developmentTime === null || !roast || roast.duration === 0) return null;
    return (developmentTime / roast.duration) * 100;
  }, [developmentTime, roast]);

  const scoreStyle = useMemo(() => {
    return getScoreColor(roast?.cupping_score ?? null);
  }, [roast?.cupping_score]);

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
                onPress={() => router.navigate("/(tabs)/roasts")}
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
                <Text style={detailStyles.headerTitle}>Roast</Text>
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
  if (error || !roast) {
    return (
      <View style={detailStyles.screen}>
        <View style={[detailStyles.header, { paddingTop: insets.top + 12 }]}>
          <View style={detailStyles.headerContent}>
            <View style={detailStyles.headerLeft}>
              <TouchableOpacity
                style={detailStyles.backButton}
                activeOpacity={0.7}
                onPress={() => router.navigate("/(tabs)/roasts")}
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
                <Text style={detailStyles.headerTitle}>Roast</Text>
                <Text style={detailStyles.headerSubtitle}>Details</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={detailStyles.errorContainer}>
          <Text style={detailStyles.errorText}>
            {error ?? "Roast not found."}
          </Text>
          <TouchableOpacity
            style={detailStyles.retryButton}
            onPress={() => router.navigate("/(tabs)/roasts")}
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
              onPress={() => router.navigate("/(tabs)/roasts")}
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
                {roast.profile_name}
              </Text>
              <Text style={detailStyles.headerSubtitle}>
                {roast.bean_type ?? formatDate(roast.roasted_at)}
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
        {/* 1. Roast Curve Chart */}
        <View style={detailStyles.card}>
          <View style={detailStyles.cardHeader}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke={Colors.sky}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={detailStyles.cardTitle}>Roast Curve</Text>
          </View>
          {roast.curve_data ? (
            <RoastCurveChart
              curveData={roast.curve_data}
              duration={roast.duration}
              events={roast.events}
              phases={roast.phases}
              clipId="roast-plot-clip"
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
                No curve data available
              </Text>
              <Text style={detailStyles.emptyCurveSubtext}>
                This roast does not have recorded curve data.
              </Text>
            </View>
          )}
        </View>

        {/* 2. Phase Bar */}
        <PhaseBar phases={roast.phases} duration={roast.duration} />

        {/* 3. Key Metrics Row 1: Start Bean Temp | End Bean Temp | End Air Temp */}
        <View style={detailStyles.metricsRow}>
          <StatCard
            label="START BEAN"
            value={
              startBeanTemp !== null ? startBeanTemp.toFixed(0) : "-"
            }
            unit={startBeanTemp !== null ? "\u00B0" : ""}
            color={Colors.sky}
          />
          <StatCard
            label="END BEAN"
            value={
              endBeanTemp !== null ? endBeanTemp.toFixed(0) : "-"
            }
            unit={endBeanTemp !== null ? "\u00B0" : ""}
            color={Colors.sky}
          />
          <StatCard
            label="END AIR"
            value={
              endAirTemp !== null ? endAirTemp.toFixed(0) : "-"
            }
            unit={endAirTemp !== null ? "\u00B0" : ""}
            color={Colors.boven}
          />
        </View>

        {/* 4. Key Metrics Row 2: First Crack | Development | Duration */}
        <View style={detailStyles.metricsRow}>
          {firstCrackEvent ? (
            <>
              <StatCard
                label="FIRST CRACK"
                value={formatDuration(Math.round(firstCrackEvent.timePassed))}
                unit={
                  firstCrackTemp !== null
                    ? ` @ ${firstCrackTemp.toFixed(0)}\u00B0`
                    : ""
                }
                color={Colors.traffic}
              />
              <StatCard
                label="DEVELOPMENT"
                value={
                  developmentTime !== null
                    ? formatDuration(Math.round(developmentTime))
                    : "-"
                }
                unit={
                  developmentPct !== null
                    ? ` (${developmentPct.toFixed(0)}%)`
                    : ""
                }
                color={Colors.grape}
              />
            </>
          ) : null}
          <StatCard
            label="DURATION"
            value={formatDuration(roast.duration)}
            color={Colors.text}
          />
        </View>

        {/* 5. Key Metrics Row 3: Start Weight | End Weight | Weight Loss */}
        <View style={detailStyles.metricsRow}>
          <StatCard
            label="START WEIGHT"
            value={
              roast.start_weight !== null
                ? (roast.start_weight / 1000).toFixed(1)
                : "-"
            }
            unit={roast.start_weight !== null ? " kg" : ""}
          />
          <StatCard
            label="END WEIGHT"
            value={
              roast.end_weight !== null
                ? (roast.end_weight / 1000).toFixed(1)
                : "-"
            }
            unit={roast.end_weight !== null ? " kg" : ""}
          />
          <StatCard
            label="LOSS"
            value={
              roast.weight_change !== null
                ? Math.abs(roast.weight_change).toFixed(1)
                : "-"
            }
            unit={roast.weight_change !== null ? "%" : ""}
            color={Colors.boven}
          />
        </View>

        {/* 6. Cupping Score */}
        {roast.cupping_score !== null ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  stroke={scoreStyle.color}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Cupping Score</Text>
            </View>
            <View style={detailStyles.scoreContainer}>
              <View
                style={[
                  detailStyles.scoreBadgeLarge,
                  { backgroundColor: scoreStyle.bg },
                ]}
              >
                <Text
                  style={[
                    detailStyles.scoreValueLarge,
                    { color: scoreStyle.color },
                  ]}
                >
                  {roast.cupping_score.toFixed(1)}
                </Text>
              </View>
              <Text style={detailStyles.scoreLabel}>
                {roast.cupping_score >= 90
                  ? "Outstanding"
                  : roast.cupping_score >= 85
                    ? "Excellent"
                    : roast.cupping_score >= 80
                      ? "Very Good"
                      : "Good"}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 7. Green Bean / Blend Card */}
        {roast.inventory_selections.length > 0 ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l5.7 3.2-3.1 3.1-.8-.3c-.4-.1-.8 0-1 .3l-.2.3c-.2.3-.1.7.1 1l1.7 1.7c.3.3.7.3 1 .1l.3-.2c.3-.2.4-.6.3-1l-.3-.8 3.1-3.1 3.2 5.7c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"
                  stroke={Colors.leaf}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>
                {roast.inventory_selections.length === 1
                  ? "Green Bean"
                  : "Blend"}
              </Text>
            </View>
            {roast.inventory_selections.map((sel, index) => (
              <TouchableOpacity
                key={sel.inventory_id}
                activeOpacity={0.7}
                onPress={() => router.push(`/inventory/${sel.inventory_id}`)}
              >
                {index > 0 ? (
                  <View style={detailStyles.detailDivider} />
                ) : null}
                <View style={detailStyles.inventoryRow}>
                  <View style={detailStyles.inventoryInfo}>
                    <Text
                      style={detailStyles.inventoryName}
                      numberOfLines={1}
                    >
                      {sel.inventory_name}
                    </Text>
                    <Text style={detailStyles.inventoryNumber}>
                      {sel.formatted_inventory_number}
                    </Text>
                  </View>
                  <View style={detailStyles.inventoryRight}>
                    <Text style={detailStyles.inventoryWeight}>
                      {(sel.quantity_grams / 1000).toFixed(1)} kg
                    </Text>
                    <Svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
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
                <View style={detailStyles.inventoryBarBg}>
                  <View
                    style={[
                      detailStyles.inventoryBarFill,
                      {
                        width: `${sel.percentage}%`,
                        backgroundColor: Colors.leaf,
                      },
                    ]}
                  />
                </View>
                <Text style={detailStyles.inventoryPct}>
                  {sel.percentage.toFixed(0)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* 8. Roast Info Card */}
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
            <Text style={detailStyles.cardTitle}>Roast Info</Text>
          </View>

          <View style={detailStyles.detailRow}>
            <Text style={detailStyles.detailLabel}>Profile</Text>
            <Text style={detailStyles.detailValue}>
              {roast.profile?.name ?? roast.profile_name}
            </Text>
          </View>

          <View style={detailStyles.detailDivider} />

          <View style={detailStyles.detailRow}>
            <Text style={detailStyles.detailLabel}>Device</Text>
            <Text style={detailStyles.detailValue}>{roast.device_name}</Text>
          </View>

          {roast.bean_type ? (
            <>
              <View style={detailStyles.detailDivider} />
              <View style={detailStyles.detailRow}>
                <Text style={detailStyles.detailLabel}>Bean Type</Text>
                <Text style={detailStyles.detailValue}>
                  {roast.bean_type}
                </Text>
              </View>
            </>
          ) : null}

          <View style={detailStyles.detailDivider} />

          <View style={detailStyles.detailRow}>
            <Text style={detailStyles.detailLabel}>Date</Text>
            <Text style={detailStyles.detailValue}>
              {formatDate(roast.roasted_at)}
            </Text>
          </View>

          {roast.is_favorite ? (
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

        {/* 9. Linked Cupping Sessions */}
        {roast.cupping_samples.length > 0 ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 2v4M10 2v4M14 2v4"
                  stroke={Colors.grape}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Cupping Sessions</Text>
              <Text style={detailStyles.cardCount}>
                {roast.cupping_samples.length}
              </Text>
            </View>
            {roast.cupping_samples.map((sample, index) => {
              const sampleScore = getScoreColor(sample.average_score);
              return (
                <TouchableOpacity
                  key={sample.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/quality/${sample.session_id}`)}
                >
                  {index > 0 ? (
                    <View style={detailStyles.cuppingDivider} />
                  ) : null}
                  <View style={detailStyles.cuppingRow}>
                    <View style={detailStyles.cuppingLeft}>
                      <Text
                        style={detailStyles.cuppingSampleCode}
                        numberOfLines={1}
                      >
                        {sample.sample_code}
                      </Text>
                    </View>
                    <View style={detailStyles.cuppingRight}>
                      {sample.average_score !== null ? (
                        <View
                          style={[
                            detailStyles.cuppingScoreBadge,
                            { backgroundColor: sampleScore.bg },
                          ]}
                        >
                          <Text
                            style={[
                              detailStyles.cuppingScoreText,
                              { color: sampleScore.color },
                            ]}
                          >
                            {sample.average_score.toFixed(1)}
                          </Text>
                        </View>
                      ) : (
                        <Text style={detailStyles.cuppingNoScore}>-</Text>
                      )}
                      <Svg
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
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
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* 10. Comment Card */}
        {roast.comment ? (
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
            <Text style={detailStyles.commentText}>{roast.comment}</Text>
          </View>
        ) : null}
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
    paddingHorizontal: 16,
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

  /* -- Cupping Score -- */
  scoreContainer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  scoreBadgeLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scoreValueLarge: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 36,
    lineHeight: 40,
  },
  scoreLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
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

  /* -- Inventory / Blend -- */
  inventoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  inventoryInfo: {
    flex: 1,
    gap: 2,
  },
  inventoryName: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  inventoryNumber: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  inventoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inventoryWeight: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  inventoryBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gravelLight,
    marginTop: 8,
  },
  inventoryBarFill: {
    height: 6,
    borderRadius: 3,
  },
  inventoryPct: {
    fontFamily: "DMSans-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 4,
  },

  /* -- Cupping Sessions -- */
  cuppingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  cuppingLeft: {
    flex: 1,
    gap: 4,
  },
  cuppingSampleCode: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  cuppingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cuppingScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cuppingScoreText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    lineHeight: 16,
  },
  cuppingNoScore: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  cuppingDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
