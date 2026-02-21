import { useState, useEffect, useCallback } from "react";
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
import Svg, { Path, Rect } from "react-native-svg";
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

interface Sample {
  id: number;
  sample_number: number;
  sample_code: string;
  label: string | null;
  notes: string | null;
  average_score: number | null;
  attributes: AttributeScore[];
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
  form: { id: number; name: string; type: string };
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
    case "active":
      return { label: "Active", color: Colors.boven, bg: Colors.bovenBg };
    case "completed":
      return { label: "Completed", color: Colors.leaf, bg: Colors.leafBg };
    case "draft":
      return { label: "Draft", color: Colors.sky, bg: Colors.skyBg };
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

function SampleCard({ sample }: { sample: Sample }) {
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

      {/* Attribute bars */}
      {sample.attributes.length > 0 ? (
        <View style={styles.attrBarsContainer}>
          {sample.attributes.map((attr, idx) => (
            <AttributeBar key={idx} label={attr.label} score={attr.score} />
          ))}
        </View>
      ) : (
        <Text style={styles.noAttrsText}>No attribute scores yet</Text>
      )}

      {/* Notes */}
      {sample.notes ? (
        <View style={styles.sampleNotes}>
          <Text style={styles.sampleNotesLabel}>Notes</Text>
          <Text style={styles.sampleNotesText}>{sample.notes}</Text>
        </View>
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
  const sampleCount = session.samples.length;
  const scoredCount = session.samples.filter(
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
            <Text style={styles.infoValue}>{session.form.name}</Text>
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
              {session.samples.map((sample) => (
                <SampleCard key={sample.id} sample={sample} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
});
