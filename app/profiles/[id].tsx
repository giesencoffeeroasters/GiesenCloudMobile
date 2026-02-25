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
import type {
  ProfilerProfileDetail,
  ProfileRecentRoast,
  RoastEvent,
  RoastPhase,
  RoastSetpoint,
  ExtendedCurveData,
  CurvePoint,
} from "@/types";

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

function formatSetpointLabel(key: string): string {
  const labels: Record<string, string> = {
    power: "Power",
    air: "Air Temp",
    speed: "Drum Speed",
    pressure: "Pressure",
  };
  return labels[key] ?? key;
}

function formatSetpointValue(setpoint: RoastSetpoint): string {
  if (setpoint.key === "power") {
    if (setpoint.value === -1) return "Auto";
    if (setpoint.value === 0) return "Off";
    return `${setpoint.value}%`;
  }
  return String(setpoint.value);
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  FIRST_CRACK: "First Crack",
  SECOND_CRACK: "Second Crack",
  CHARGE: "Charge",
  DROP: "Drop",
  TURNING_POINT: "Turning Point",
  YELLOW: "Yellowing",
};

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
          {roast.profile_name}
        </Text>
        <Text style={detailStyles.recentRoastMeta}>
          {roast.bean_type ? `${roast.bean_type} \u00B7 ` : ""}{roast.device_name} {"\u00B7"} {formatRoastTime(roast.roasted_at)}
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

  /* -- Computed values -- */

  const firstCrackEvent = useMemo(() => {
    if (!profile?.events) return null;
    return profile.events.find((e) => e.type === "FIRST_CRACK") ?? null;
  }, [profile?.events]);

  const firstCrackTemp = useMemo(() => {
    if (!firstCrackEvent || !profile?.curve_data?.bean_temp?.length) return null;
    const beanPoints = profile.curve_data.bean_temp;
    let closest = beanPoints[0];
    let minDiff = Math.abs(beanPoints[0].time - firstCrackEvent.timePassed);
    for (let i = 1; i < beanPoints.length; i++) {
      const diff = Math.abs(beanPoints[i].time - firstCrackEvent.timePassed);
      if (diff < minDiff) {
        minDiff = diff;
        closest = beanPoints[i];
      }
    }
    return closest.value;
  }, [firstCrackEvent, profile?.curve_data?.bean_temp]);

  const developmentTime = useMemo(() => {
    if (!firstCrackEvent || !profile?.duration) return null;
    return profile.duration - firstCrackEvent.timePassed;
  }, [firstCrackEvent, profile?.duration]);

  const developmentPercentage = useMemo(() => {
    if (developmentTime === null || !profile?.duration || profile.duration === 0) return null;
    return (developmentTime / profile.duration) * 100;
  }, [developmentTime, profile?.duration]);

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
        {/* 1. Reference Curve Chart */}
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
            <RoastCurveChart
              curveData={profile.curve_data}
              duration={profile.duration ?? 600}
              events={profile.events}
              phases={profile.phases}
              clipId="profile-plot-clip"
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

        {/* 2. Phase Bar */}
        {profile.phases.length > 0 && profile.duration ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke={Colors.boven}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Phases</Text>
            </View>
            <View style={detailStyles.phaseBar}>
              {profile.phases.map((phase, index) => {
                const phaseDuration = phase.end_time - phase.start_time;
                const percentage = (phaseDuration / profile.duration!) * 100;
                return (
                  <View
                    key={`phase-${index}`}
                    style={[
                      detailStyles.phaseSegment,
                      {
                        flex: percentage,
                        backgroundColor: phase.color || Colors.gravelLight,
                      },
                      index === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                      index === profile.phases.length - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                    ]}
                  >
                    <Text
                      style={detailStyles.phaseSegmentName}
                      numberOfLines={1}
                    >
                      {phase.name}
                    </Text>
                    <Text style={detailStyles.phaseSegmentValue}>
                      {formatDuration(Math.round(phaseDuration))} ({percentage.toFixed(0)}%)
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* 3. Key Metrics Row 1 */}
        {firstCrackEvent ? (
          <View style={detailStyles.metricsRow}>
            <StatCard
              label="DURATION"
              value={formatDuration(profile.duration)}
              color={Colors.text}
            />
            <StatCard
              label="FIRST CRACK"
              value={formatDuration(firstCrackEvent.timePassed)}
              unit={firstCrackTemp !== null ? ` @ ${firstCrackTemp.toFixed(0)}\u00B0` : ""}
              color={Colors.boven}
            />
            <StatCard
              label="DEVELOPMENT"
              value={developmentTime !== null ? formatDuration(Math.round(developmentTime)) : "-"}
              unit={developmentPercentage !== null ? ` (${developmentPercentage.toFixed(0)}%)` : ""}
              color={Colors.grape}
            />
          </View>
        ) : (
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
                  ? (profile.start_weight / 1000).toFixed(1)
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
        )}

        {/* 4. Key Metrics Row 2 */}
        <View style={detailStyles.metricsRow}>
          <StatCard
            label="START WEIGHT"
            value={
              profile.start_weight !== null
                ? (profile.start_weight / 1000).toFixed(1)
                : "-"
            }
            unit={profile.start_weight !== null ? " kg" : ""}
          />
          <StatCard
            label="END WEIGHT"
            value={
              profile.end_weight !== null
                ? (profile.end_weight / 1000).toFixed(1)
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

        {/* 5. Profile Info Card */}
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

        {/* 6. Charge & Setpoints Card */}
        {profile.curve_data ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  stroke={Colors.sky}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Charge</Text>
            </View>

            {profile.curve_data.bean_temp?.[0] ? (
              <View style={detailStyles.detailRow}>
                <Text style={detailStyles.detailLabel}>Bean Temp</Text>
                <Text style={detailStyles.detailValue}>
                  {profile.curve_data.bean_temp[0].value.toFixed(0)}{"\u00B0"}
                </Text>
              </View>
            ) : null}

            {profile.curve_data.drum_temp?.[0] ? (
              <>
                <View style={detailStyles.detailDivider} />
                <View style={detailStyles.detailRow}>
                  <Text style={detailStyles.detailLabel}>Air Temp</Text>
                  <Text style={detailStyles.detailValue}>
                    {profile.curve_data.drum_temp[0].value.toFixed(0)}{"\u00B0"}
                  </Text>
                </View>
              </>
            ) : null}

            {profile.curve_data.power?.[0] ? (
              <>
                <View style={detailStyles.detailDivider} />
                <View style={detailStyles.detailRow}>
                  <Text style={detailStyles.detailLabel}>Power</Text>
                  <Text style={detailStyles.detailValue}>
                    {profile.curve_data.power[0].value === -1
                      ? "Auto"
                      : profile.curve_data.power[0].value === 0
                        ? "Off"
                        : `${profile.curve_data.power[0].value}%`}
                  </Text>
                </View>
              </>
            ) : null}

            {profile.curve_data.drum_speed?.[0] ? (
              <>
                <View style={detailStyles.detailDivider} />
                <View style={detailStyles.detailRow}>
                  <Text style={detailStyles.detailLabel}>Drum Speed</Text>
                  <Text style={detailStyles.detailValue}>
                    {profile.curve_data.drum_speed[0].value}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* 6b. Setpoints Card */}
        {profile.setpoints.length > 0 ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke={Colors.sun}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Setpoints</Text>
              <Text style={detailStyles.cardCount}>
                {profile.setpoints.length}
              </Text>
            </View>
            {profile.setpoints.map((sp, index) => (
              <View key={`sp-${index}`}>
                {index > 0 ? <View style={detailStyles.detailDivider} /> : null}
                <View style={detailStyles.eventRow}>
                  {sp.timePassed != null ? (
                    <View style={detailStyles.eventTimeBadge}>
                      <Text style={detailStyles.eventTimeText}>
                        {formatDuration(Math.round(sp.timePassed))}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={detailStyles.eventLabel}>
                    {formatSetpointLabel(sp.key)}
                  </Text>
                  <Text style={[detailStyles.detailValue, { marginLeft: "auto" }]}>
                    {formatSetpointValue(sp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* 7. Event Timeline Card */}
        {profile.events.length > 0 ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"
                  stroke={Colors.leaf}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Event Timeline</Text>
              <Text style={detailStyles.cardCount}>
                {profile.events.length}
              </Text>
            </View>
            {profile.events.map((event, index) => (
              <View key={`event-${index}`}>
                {index > 0 ? <View style={detailStyles.detailDivider} /> : null}
                <View style={detailStyles.eventRow}>
                  <View style={detailStyles.eventTimeBadge}>
                    <Text style={detailStyles.eventTimeText}>
                      {formatDuration(Math.round(event.timePassed))}
                    </Text>
                  </View>
                  <Text style={detailStyles.eventLabel}>
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* 8. Connected Inventories Card */}
        {profile.inventories.length > 0 ? (
          <View style={detailStyles.card}>
            <View style={detailStyles.cardHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10"
                  stroke={Colors.leaf}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={detailStyles.cardTitle}>Connected Inventories</Text>
              <Text style={detailStyles.cardCount}>
                {profile.inventories.length}
              </Text>
            </View>
            {profile.inventories.map((inv, index) => (
              <TouchableOpacity
                key={`inv-${inv.id}`}
                activeOpacity={0.7}
                onPress={() => router.push(`/inventory/${inv.id}`)}
              >
                {index > 0 ? <View style={detailStyles.detailDivider} /> : null}
                <View style={detailStyles.inventoryRow}>
                  <View style={detailStyles.inventoryLeft}>
                    <Text style={detailStyles.inventoryName} numberOfLines={1}>
                      {inv.name}
                    </Text>
                    <Text style={detailStyles.inventoryNumber}>
                      {inv.formatted_inventory_number}
                    </Text>
                  </View>
                  <View style={detailStyles.inventoryRight}>
                    {inv.is_main ? (
                      <View style={detailStyles.mainBadge}>
                        <Text style={detailStyles.mainBadgeText}>Main</Text>
                      </View>
                    ) : null}
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
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* 9. Comment Card */}
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

        {/* 10. Recent Roasts Section */}
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

  /* -- Phase Bar -- */
  phaseBar: {
    flexDirection: "row",
    height: 56,
    borderRadius: 6,
    overflow: "hidden",
    gap: 2,
  },
  phaseSegment: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  phaseSegmentName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 10,
    color: "#ffffff",
    textAlign: "center",
  },
  phaseSegmentValue: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 9,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 2,
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

  /* -- Setpoints -- */
  setpointDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 14,
    marginBottom: 12,
  },
  setpointSectionLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  setpointTime: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },

  /* -- Event Timeline -- */
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  eventTimeBadge: {
    backgroundColor: Colors.gravelLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 56,
    alignItems: "center",
  },
  eventTimeText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
    color: Colors.text,
  },
  eventLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },

  /* -- Connected Inventories -- */
  inventoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  inventoryLeft: {
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
  mainBadge: {
    backgroundColor: Colors.leafBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  mainBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.leaf,
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
