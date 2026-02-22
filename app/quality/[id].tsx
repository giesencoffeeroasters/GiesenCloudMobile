import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect, ErrorBoundaryProps } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Line, Polygon, Circle, G, Text as SvgText } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AttributeScore {
  label: string;
  score: number;
}

interface SampleEvaluation {
  id: number;
  total_score: number | null;
  defect_cups: number;
  defect_intensity: number;
  notes: string | null;
  scores: { cupping_form_attribute_id: number; score: number }[];
  cup_scores: { cupping_form_attribute_id: number; cup_number: number; passed: boolean }[];
}

interface Sample {
  id: number;
  sample_number: number;
  sample_code: string;
  label: string | null;
  notes: string | null;
  average_score: number | null;
  attributes: AttributeScore[];
  my_evaluation: SampleEvaluation | null;
}

interface SessionDetail {
  id: number;
  name: string;
  description: string | null;
  status: string;
  is_blind: boolean;
  scheduled_at: string | null;
  created_at: string | null;
  creator: { id: number; name: string } | null;
  overall_score: number | null;
  form: {
    id: number;
    name: string;
    type: string;
    attributes: Array<{
      id: number;
      name: string;
      label: string;
      min_score: number;
      max_score: number;
      step: number;
      sort_order: number;
      is_required: boolean;
      has_cup_tracking: boolean;
      has_descriptors: boolean;
      score_group: string | null;
    }>;
  };
  samples: Sample[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): string {
  if (score >= 85) return Colors.leaf;
  if (score >= 80) return Colors.sky;
  if (score >= 70) return Colors.sun;
  return Colors.traffic;
}

function getScoreColorBg(score: number): string {
  if (score >= 85) return Colors.leafBg;
  if (score >= 80) return Colors.skyBg;
  if (score >= 70) return Colors.sunBg;
  return Colors.trafficBg;
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

function getStatusConfig(status: string): {
  label: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case "draft":
      return { label: "Draft", color: Colors.sky, bg: Colors.skyBg };
    case "in_progress":
      return { label: "In Progress", color: Colors.boven, bg: Colors.bovenBg };
    case "completed":
      return { label: "Completed", color: Colors.leaf, bg: Colors.leafBg };
    default:
      return {
        label: status,
        color: Colors.textSecondary,
        bg: Colors.gravelLight,
      };
  }
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

function BlindIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1 1l22 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Radar Chart                                             */
/* ------------------------------------------------------------------ */

const RADAR_COLORS = [
  "#4F46E5", "#DC2626", "#059669", "#D97706",
  "#7C3AED", "#0891B2", "#DB2777", "#65A30D",
];
const RADAR_LEVELS = 5;
const RADAR_SIZE = 300;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 100;
const LABEL_OFFSET = 18;

interface RadarChartProps {
  formAttributes: SessionDetail["form"]["attributes"];
  samples: Sample[];
  isBlind: boolean;
}

function RadarChart({ formAttributes, samples, isBlind }: RadarChartProps) {
  if (!formAttributes || !samples) return null;

  // Filter out cup-tracked attributes (those are penalty metrics)
  const axes = formAttributes.filter((a) => !a.has_cup_tracking);
  const n = axes.length;

  // Only scored samples with attribute data
  const scoredSamples = samples.filter(
    (s) => s.attributes && s.attributes.length > 0
  );

  if (n < 3 || scoredSamples.length === 0) return null;

  const angleStep = (2 * Math.PI) / n;

  // Get point position for a given axis index and radius
  const getPoint = (index: number, radius: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: RADAR_CENTER + radius * Math.cos(angle),
      y: RADAR_CENTER + radius * Math.sin(angle),
    };
  };

  // Build polygon points string for a given radius
  const ringPoints = (radius: number) =>
    axes.map((_, i) => {
      const p = getPoint(i, radius);
      return `${p.x},${p.y}`;
    }).join(" ");

  // Build polygon points for a sample's scores
  const samplePoints = (sample: Sample) =>
    axes.map((attr, i) => {
      const match = sample.attributes.find((a) => a.label === (attr.label || attr.name));
      const score = match ? Number(match.score) : 0;
      const maxScore = attr.max_score || 10;
      const r = Math.min(1, Math.max(0, score / maxScore)) * RADAR_RADIUS;
      const p = getPoint(i, r);
      return `${p.x},${p.y}`;
    }).join(" ");

  // Label positioning
  const getLabelAnchor = (index: number): "start" | "middle" | "end" => {
    const angle = angleStep * index - Math.PI / 2;
    const cos = Math.cos(angle);
    if (cos > 0.25) return "start";
    if (cos < -0.25) return "end";
    return "middle";
  };

  return (
    <View style={styles.radarCard}>
      <Text style={styles.sectionTitle}>Score Comparison</Text>

      <View style={styles.radarChartWrap}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {/* Grid rings */}
          {Array.from({ length: RADAR_LEVELS }, (_, level) => {
            const r = ((level + 1) / RADAR_LEVELS) * RADAR_RADIUS;
            return (
              <Polygon
                key={`ring-${level}`}
                points={ringPoints(r)}
                fill={level % 2 === 0 ? "#F3F4F6" : "#F9FAFB"}
                stroke="#E5E7EB"
                strokeWidth={0.8}
              />
            );
          }).reverse()}

          {/* Axis lines */}
          {axes.map((_, i) => {
            const p = getPoint(i, RADAR_RADIUS);
            return (
              <Line
                key={`axis-${i}`}
                x1={RADAR_CENTER}
                y1={RADAR_CENTER}
                x2={p.x}
                y2={p.y}
                stroke="#D1D5DB"
                strokeWidth={0.8}
              />
            );
          })}

          {/* Sample polygons */}
          {scoredSamples.map((sample, sIdx) => {
            const color = RADAR_COLORS[sIdx % RADAR_COLORS.length];
            const pts = samplePoints(sample);
            return (
              <G key={`sample-${sample.id}`}>
                <Polygon
                  points={pts}
                  fill={color}
                  fillOpacity={0.1}
                  stroke={color}
                  strokeWidth={2}
                />
                {/* Data points */}
                {axes.map((attr, i) => {
                  const match = sample.attributes.find(
                    (a) => a.label === (attr.label || attr.name)
                  );
                  const score = match ? Number(match.score) : 0;
                  const maxScore = attr.max_score || 10;
                  const r =
                    Math.min(1, Math.max(0, score / maxScore)) * RADAR_RADIUS;
                  const p = getPoint(i, r);
                  return (
                    <Circle
                      key={`dot-${sample.id}-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.5}
                      fill={color}
                    />
                  );
                })}
              </G>
            );
          })}

          {/* Axis labels */}
          {axes.map((attr, i) => {
            const p = getPoint(i, RADAR_RADIUS + LABEL_OFFSET);
            const anchor = getLabelAnchor(i);
            return (
              <SvgText
                key={`label-${i}`}
                x={p.x}
                y={p.y}
                textAnchor={anchor}
                alignmentBaseline="central"
                fontSize={10}
                fill="#6B7280"
                fontFamily="DMSans-Regular"
              >
                {attr.label || attr.name}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.radarLegend}>
        {scoredSamples.map((sample, sIdx) => {
          const color = RADAR_COLORS[sIdx % RADAR_COLORS.length];
          const name = isBlind
            ? `Sample ${sample.sample_code}`
            : sample.label || `Sample ${sample.sample_code}`;
          return (
            <View key={sample.id} style={styles.radarLegendItem}>
              <View
                style={[styles.radarLegendDot, { backgroundColor: color }]}
              />
              <Text style={styles.radarLegendText} numberOfLines={1}>
                {name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Attribute Score Bar                                     */
/* ------------------------------------------------------------------ */

function AttributeBar({
  label,
  score,
  maxScore = 10,
}: {
  label: string;
  score: number;
  maxScore?: number;
}) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = getScoreColor((score / maxScore) * 100);

  return (
    <View style={styles.attrBarRow}>
      <Text style={styles.attrBarLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.attrBarTrack}>
        <View
          style={[
            styles.attrBarFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.attrBarScore, { color }]}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Sample Card                                             */
/* ------------------------------------------------------------------ */

function SampleCard({
  sample,
  sessionId,
  sessionStatus,
}: {
  sample: Sample;
  sessionId: number;
  sessionStatus: string;
}) {
  const score = sample.average_score;
  const scoreColor =
    score !== null ? getScoreColor(score) : Colors.textTertiary;
  const scoreBg =
    score !== null ? getScoreColorBg(score) : Colors.gravelLight;

  return (
    <View style={styles.sampleCard}>
      {/* Sample header */}
      <View style={styles.sampleHeader}>
        <View style={styles.sampleIdentity}>
          <View style={styles.sampleCodeBadge}>
            <Text style={styles.sampleCodeText}>{sample.sample_code}</Text>
          </View>
          <View style={styles.sampleLabelWrap}>
            <Text style={styles.sampleNumber}>
              Sample #{sample.sample_number}
            </Text>
            {sample.label ? (
              <Text style={styles.sampleLabel} numberOfLines={1}>
                {sample.label}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.sampleScoreBadge, { backgroundColor: scoreBg }]}>
          <Text style={[styles.sampleScoreText, { color: scoreColor }]}>
            {score !== null ? score.toFixed(1) : "-"}
          </Text>
        </View>
      </View>

      {/* User's evaluation score */}
      {sample.my_evaluation?.total_score != null ? (
        <View style={styles.myScoreRow}>
          <Text style={styles.myScoreLabel}>Your Score</Text>
          <Text
            style={[
              styles.myScoreValue,
              { color: getScoreColor(Number(sample.my_evaluation.total_score)) },
            ]}
          >
            {Number(sample.my_evaluation.total_score).toFixed(2)}
          </Text>
        </View>
      ) : null}

      {/* Attribute bars */}
      {sample.attributes && sample.attributes.length > 0 ? (
        <View style={styles.attrBarsContainer}>
          {sample.attributes.map((attr, idx) => (
            <AttributeBar key={idx} label={attr.label} score={Number(attr.score)} />
          ))}
        </View>
      ) : sample.my_evaluation == null ? (
        <Text style={styles.noAttrsText}>No attribute scores yet</Text>
      ) : null}

      {/* Notes */}
      {sample.notes ? (
        <View style={styles.sampleNotes}>
          <Text style={styles.sampleNotesLabel}>Notes</Text>
          <Text style={styles.sampleNotesText}>{sample.notes}</Text>
        </View>
      ) : null}

      {sessionStatus !== "completed" ? (
        <TouchableOpacity
          style={styles.scoreSampleButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push(
              `/quality/score?sessionId=${sessionId}&sampleId=${sample.id}`
            )
          }
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
              stroke={sample.average_score !== null ? Colors.boven : Colors.sky}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              stroke={sample.average_score !== null ? Colors.boven : Colors.sky}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text
            style={[
              styles.scoreSampleButtonText,
              { color: sample.average_score !== null ? Colors.boven : Colors.sky },
            ]}
          >
            {sample.average_score !== null ? "Edit Score" : "Score Sample"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function QualityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const response = await apiClient.get(`/quality/${id}`);
      setSession(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch quality session:", err);
      setError("Failed to load session details.");
    }
  }, [id]);

  useEffect(() => {
    fetchSession().finally(() => setLoading(false));
  }, [fetchSession]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSession();
    setRefreshing(false);
  }, [fetchSession]);

  useFocusEffect(
    useCallback(() => {
      // Refresh when screen comes into focus (e.g., returning from scoring)
      if (!loading) {
        fetchSession();
      }
    }, [fetchSession, loading])
  );

  const handleCompleteSession = useCallback(async () => {
    Alert.alert(
      "Complete Session",
      "Are you sure you want to complete this cupping session? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.patch(`/quality/${id}/status`, {
                status: "completed",
              });
              await fetchSession();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ?? "Failed to complete session."
              );
            }
          },
        },
      ]
    );
  }, [id, fetchSession]);

  /* ── Header (shared across states) ── */
  function renderHeader(title?: string, subtitle?: string) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title ?? "Quality"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {subtitle ?? "Session Details"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* ── Loading state ── */
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

  /* ── Error state ── */
  if (error || !session) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {error ?? "Session not found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Data ── */
  const statusCfg = getStatusConfig(session.status);
  const samples = session.samples ?? [];
  const formAttributes = session.form?.attributes ?? [];
  const sampleCount = samples.length;
  const scoredCount = samples.filter(
    (s) => s.average_score !== null
  ).length;
  const overallScore = session.overall_score;
  const overallColor =
    overallScore !== null ? getScoreColor(overallScore) : Colors.textTertiary;

  return (
    <View style={styles.screen}>
      {renderHeader(session.name, "Session Details")}

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
        {/* Score overview card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCardTop}>
            {/* Large overall score */}
            <View style={styles.overallScoreBlock}>
              <Text
                style={[styles.overallScoreValue, { color: overallColor }]}
              >
                {overallScore !== null ? overallScore.toFixed(1) : "-"}
              </Text>
              <Text style={styles.overallScoreLabel}>Overall Score</Text>
            </View>

            {/* Progress + status */}
            <View style={styles.scoreMetaBlock}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusCfg.bg },
                ]}
              >
                <Text
                  style={[styles.statusBadgeText, { color: statusCfg.color }]}
                >
                  {statusCfg.label}
                </Text>
              </View>
              <Text style={styles.progressText}>
                {scoredCount} of {sampleCount} scored
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${
                        sampleCount > 0
                          ? Math.round((scoredCount / sampleCount) * 100)
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Overall score bar */}
          {overallScore !== null ? (
            <View style={styles.overallBarWrap}>
              <View style={styles.overallBarTrack}>
                <View
                  style={[
                    styles.overallBarFill,
                    {
                      width: `${Math.min(100, overallScore)}%`,
                      backgroundColor: overallColor,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* Radar chart — score comparison */}
        <RadarChart
          formAttributes={formAttributes}
          samples={samples}
          isBlind={session.is_blind}
        />

        {/* Session info card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Session Info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Creator</Text>
            <Text style={styles.infoValue}>
              {session.creator?.name ?? "Unknown"}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {formatDate(session.scheduled_at ?? session.created_at)}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Form</Text>
            <Text style={styles.infoValue}>{session.form?.name ?? "N/A"}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <View style={styles.infoValueRow}>
              {session.is_blind ? (
                <View style={styles.blindBadge}>
                  <BlindIcon color={Colors.grape} />
                  <Text style={styles.blindBadgeText}>Blind Tasting</Text>
                </View>
              ) : (
                <Text style={styles.infoValue}>Normal</Text>
              )}
            </View>
          </View>

          {session.description ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text
                  style={[styles.infoValue, { flex: 1, textAlign: "right" }]}
                  numberOfLines={3}
                >
                  {session.description}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Samples section */}
        <View style={styles.samplesSection}>
          <Text style={styles.sectionTitle}>
            Samples ({sampleCount})
          </Text>

          {sampleCount === 0 ? (
            <View style={styles.emptyState}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <Rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.5}
                />
                <Path
                  d="M8 12h8M12 8v8"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.emptyStateTitle}>No samples yet</Text>
              <Text style={styles.emptyStateText}>
                No samples have been added to this session.
              </Text>
            </View>
          ) : (
            <View style={styles.samplesList}>
              {samples.map((sample) => (
                <SampleCard
                  key={sample.id}
                  sample={sample}
                  sessionId={session.id}
                  sessionStatus={session.status}
                />
              ))}
            </View>
          )}
        </View>

        {session.status !== "completed" ? (
          <TouchableOpacity
            style={styles.completeButton}
            activeOpacity={0.7}
            onPress={handleCompleteSession}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 6L9 17l-5-5"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.completeButtonText}>Complete Session</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Error Boundary                                                     */
/* ------------------------------------------------------------------ */

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: "center", alignItems: "center", padding: 40 }}>
      <Text style={{ fontFamily: "DMSans-SemiBold", fontSize: 18, color: Colors.text, marginBottom: 12 }}>
        Something went wrong
      </Text>
      <Text style={{ fontFamily: "DMSans-Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginBottom: 8 }}>
        {error.message}
      </Text>
      <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 11, color: Colors.textTertiary, textAlign: "center", marginBottom: 24 }}>
        {error.stack?.split("\n").slice(0, 5).join("\n")}
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: Colors.slate, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 }}
        onPress={retry}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: "DMSans-Medium", fontSize: 14, color: "#ffffff" }}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginTop: 12, paddingVertical: 8 }}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: "DMSans-Medium", fontSize: 14, color: Colors.sky }}>Go Back</Text>
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
    fontSize: 20,
    color: "#ffffff",
  },
  headerSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
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

  /* -- Score card -- */
  scoreCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  scoreCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  overallScoreBlock: {
    alignItems: "flex-start",
  },
  overallScoreValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -2,
  },
  overallScoreLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  scoreMetaBlock: {
    alignItems: "flex-end",
    gap: 8,
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
  progressText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressBarBg: {
    width: 80,
    height: 5,
    backgroundColor: Colors.gravelLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.boven,
  },
  overallBarWrap: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  overallBarTrack: {
    height: 8,
    backgroundColor: Colors.gravelLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  overallBarFill: {
    height: 8,
    borderRadius: 4,
  },

  /* -- Radar chart -- */
  radarCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  radarChartWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  radarLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  radarLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  radarLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  radarLegendText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 120,
  },

  /* -- Info card -- */
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  infoValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  blindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.grapeBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  blindBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.grape,
  },

  /* -- Samples section -- */
  samplesSection: {
    gap: 0,
  },
  samplesList: {
    gap: 12,
  },

  /* -- Sample card -- */
  sampleCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
  },
  sampleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sampleIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sampleCodeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  sampleCodeText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 14,
    color: Colors.safety,
  },
  sampleLabelWrap: {
    flex: 1,
    gap: 1,
  },
  sampleNumber: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  sampleLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sampleScoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: "center",
  },
  sampleScoreText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 16,
  },

  /* -- Attribute bars -- */
  attrBarsContainer: {
    gap: 8,
  },
  attrBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attrBarLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    width: 80,
  },
  attrBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gravelLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  attrBarFill: {
    height: 6,
    borderRadius: 3,
  },
  attrBarScore: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 11,
    width: 28,
    textAlign: "right",
  },
  noAttrsText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
  myScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  myScoreLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  myScoreValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 18,
  },

  /* -- Sample notes -- */
  sampleNotes: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 4,
  },
  sampleNotesLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sampleNotesText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* -- Empty state -- */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  emptyStateTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginTop: 8,
  },
  emptyStateText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  /* -- Score sample button -- */
  scoreSampleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scoreSampleButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
  },

  /* -- Complete button -- */
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.leaf,
    borderRadius: 10,
    paddingVertical: 16,
  },
  completeButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
});
