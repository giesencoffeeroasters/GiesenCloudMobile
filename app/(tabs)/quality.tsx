import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line, Circle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QualitySession {
  id: number;
  name: string;
  description: string | null;
  status: string;
  is_blind: boolean;
  scheduled_at: string | null;
  created_at: string;
  creator: { id: number; name: string } | null;
  sample_count: number;
  scored_count: number;
  overall_score: number | null;
}

interface QualitySummary {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): string {
  if (score >= 85) {
    return Colors.leaf;
  }
  if (score >= 80) {
    return Colors.sky;
  }
  return Colors.sun;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build score bar showing the overall score as a percentage of 100.
 */
function getScoreBarPct(overall: number): number {
  return Math.min(100, Math.max(0, overall));
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function FilterIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SamplesIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function EvaluatorIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={1.8} />
      <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Score Bar                                               */
/* ------------------------------------------------------------------ */

function ScoreBar({ overall }: { overall: number }) {
  const pct = getScoreBarPct(overall);
  const color = getScoreColor(overall);

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarSegment,
            {
              backgroundColor: color,
              width: `${pct}%`,
              borderRadius: 3,
            },
          ]}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Active Session Card                                     */
/* ------------------------------------------------------------------ */

function ActiveSessionCard({ session, onContinue }: { session: QualitySession; onContinue: () => void }) {
  const progress =
    session.sample_count > 0
      ? session.scored_count / session.sample_count
      : 0;
  const progressPct = Math.round(progress * 100);

  return (
    <View style={styles.activeCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{session.name}</Text>
          <Text style={styles.cardDate}>
            {formatDate(session.scheduled_at ?? session.created_at)}
          </Text>
        </View>
        <View style={styles.inProgressBadge}>
          <View style={styles.inProgressDot} />
          <Text style={styles.inProgressText}>In Progress</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>
            {session.scored_count} of {session.sample_count} samples scored
          </Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPct}%` },
            ]}
          />
        </View>
      </View>

      {/* Meta */}
      <View style={styles.cardMetaRow}>
        <View style={styles.cardMetaItem}>
          <SamplesIcon color={Colors.textTertiary} />
          <Text style={styles.cardMetaText}>
            {session.sample_count} samples
          </Text>
        </View>
        <View style={styles.cardMetaItem}>
          <EvaluatorIcon color={Colors.textTertiary} />
          <Text style={styles.cardMetaText}>
            {session.creator ? "1 evaluator" : "0 evaluators"}
          </Text>
        </View>
      </View>

      {/* Continue button */}
      <TouchableOpacity
        style={styles.continueButton}
        activeOpacity={0.7}
        onPress={onContinue}
      >
        <Text style={styles.continueButtonText}>Continue Scoring</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Completed Session Card                                  */
/* ------------------------------------------------------------------ */

function CompletedSessionCard({ session }: { session: QualitySession }) {
  const score = session.overall_score;
  const scoreColor = score !== null ? getScoreColor(score) : Colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.completedCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/quality/${session.id}`)}
    >
      {/* Top section: info + large score */}
      <View style={styles.completedTop}>
        <View style={styles.completedInfo}>
          <Text style={styles.cardName}>{session.name}</Text>
          <Text style={styles.cardDate}>
            {formatDate(session.scheduled_at ?? session.created_at)}
          </Text>
        </View>
        <View style={styles.completedScoreBlock}>
          <Text style={[styles.completedScore, { color: scoreColor }]}>
            {score !== null ? score.toFixed(1) : "-"}
          </Text>
          <Text style={styles.completedScoreLabel}>Avg Score</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.completedMetaRow}>
        <View style={styles.cardMetaItem}>
          <SamplesIcon color={Colors.textTertiary} />
          <Text style={styles.cardMetaText}>
            {session.sample_count} samples
          </Text>
        </View>
        <View style={styles.cardMetaItem}>
          <EvaluatorIcon color={Colors.textTertiary} />
          <Text style={styles.cardMetaText}>
            {session.creator ? "1 evaluator" : "0 evaluators"}
          </Text>
        </View>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      </View>

      {/* Score bar visualization */}
      {score !== null ? (
        <ScoreBar overall={score} />
      ) : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

type FilterOption = "all" | "active" | "completed" | "blind";

export default function QualityScreen() {
  const insets = useSafeAreaInsets();
  const [activeSessions, setActiveSessions] = useState<QualitySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<QualitySession[]>(
    []
  );
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const activeSectionY = useRef(0);
  const completedSectionY = useRef(0);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await apiClient.get("/quality", {
        params: { per_page: 50 },
      });
      const sessions: QualitySession[] = response.data.data;
      setActiveSessions(sessions.filter((s) => s.status !== "completed"));
      setCompletedSessions(sessions.filter((s) => s.status === "completed"));
    } catch (error) {
      console.error("Failed to fetch quality sessions:", error);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await apiClient.get("/quality/summary");
      setSummary(response.data.data);
    } catch (error) {
      console.error("Failed to fetch quality summary:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([fetchSessions(), fetchSummary()]);
  }, [fetchSessions, fetchSummary]);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setIsLoading(false));
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const scoredSessions = completedSessions.filter((s) => s.overall_score !== null);
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce((sum, s) => sum + (s.overall_score as number), 0) /
        scoredSessions.length
      : null;

  const samplesYTD = completedSessions.reduce(
    (sum, s) => sum + s.sample_count,
    0
  );

  const shouldShowActive =
    activeFilter === "all" || activeFilter === "active";
  const shouldShowCompleted =
    activeFilter === "all" || activeFilter === "completed";
  const shouldShowBlind = activeFilter === "blind";

  const blindSessions = [
    ...activeSessions.filter((s) => s.is_blind),
    ...completedSessions.filter((s) => s.is_blind),
  ];

  const PREVIEW_LIMIT = 3;
  const displayedActive = showAllActive
    ? activeSessions
    : activeSessions.slice(0, PREVIEW_LIMIT);
  const displayedCompleted = showAllCompleted
    ? completedSessions
    : completedSessions.slice(0, PREVIEW_LIMIT);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.gLogo}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Quality</Text>
              <Text style={styles.headerSubtitle}>Cupping Sessions</Text>
            </View>
          </View>
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
        <View style={styles.headerLeft}>
          <View style={styles.gLogo}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Quality</Text>
            <Text style={styles.headerSubtitle}>Cupping Sessions</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, showFilter && styles.headerBtnActive]}
            activeOpacity={0.7}
            onPress={() => {
              setShowFilter((prev) => !prev);
              if (showFilter) {
                setActiveFilter("all");
              }
            }}
          >
            <FilterIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/quality/create")}
          >
            <PlusIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      {showFilter && (
        <View style={styles.filterRow}>
          {(["all", "active", "completed", "blind"] as FilterOption[]).map(
            (option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterChip,
                  activeFilter === option && styles.filterChipActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setActiveFilter(option)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === option && styles.filterChipTextActive,
                  ]}
                >
                  {option === "all"
                    ? "All"
                    : option === "active"
                    ? "Active"
                    : option === "completed"
                    ? "Completed"
                    : "Blind"}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View
              style={[styles.statStripe, { backgroundColor: Colors.sky }]}
            />
            <Text style={[styles.statValue, { color: Colors.sky }]}>
              {summary?.active_sessions ?? "-"}
            </Text>
            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statStripe, { backgroundColor: Colors.leaf }]}
            />
            <Text style={[styles.statValue, { color: Colors.leaf }]}>
              {avgScore !== null ? avgScore.toFixed(1) : "-"}
            </Text>
            <Text style={styles.statLabel}>AVG SCORE</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statStripe, { backgroundColor: Colors.grape }]}
            />
            <Text style={[styles.statValue, { color: Colors.grape }]}>
              {samplesYTD > 0 ? samplesYTD : "-"}
            </Text>
            <Text style={styles.statLabel}>SAMPLES YTD</Text>
          </View>
        </View>

        {/* Blind sessions (only when blind filter active) */}
        {shouldShowBlind && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Blind Sessions</Text>
            </View>
            <View style={styles.sectionCards}>
              {blindSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No blind sessions.</Text>
                </View>
              ) : (
                blindSessions.map((session) =>
                  session.status !== "completed" ? (
                    <ActiveSessionCard key={session.id} session={session} onContinue={() => router.push(`/quality/${session.id}`)} />
                  ) : (
                    <CompletedSessionCard key={session.id} session={session} />
                  )
                )
              )}
            </View>
          </View>
        )}

        {/* Active sessions */}
        {shouldShowActive && !shouldShowBlind && (
          <View
            style={styles.section}
            onLayout={(e) => {
              activeSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              {activeSessions.length > PREVIEW_LIMIT && !showAllActive ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowAllActive(true);
                    scrollRef.current?.scrollTo({
                      y: activeSectionY.current,
                      animated: true,
                    });
                  }}
                >
                  <Text style={styles.sectionLink}>View All</Text>
                </TouchableOpacity>
              ) : activeSessions.length > PREVIEW_LIMIT && showAllActive ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => setShowAllActive(false)}
                >
                  <Text style={styles.sectionLink}>Show Less</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.sectionCards}>
              {activeSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active sessions.</Text>
                </View>
              ) : (
                displayedActive.map((session) => (
                  <ActiveSessionCard key={session.id} session={session} onContinue={() => router.push(`/quality/${session.id}`)} />
                ))
              )}
            </View>
          </View>
        )}

        {/* Completed sessions */}
        {shouldShowCompleted && !shouldShowBlind && (
          <View
            style={styles.section}
            onLayout={(e) => {
              completedSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed</Text>
              {completedSessions.length > PREVIEW_LIMIT &&
              !showAllCompleted ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowAllCompleted(true);
                    scrollRef.current?.scrollTo({
                      y: completedSectionY.current,
                      animated: true,
                    });
                  }}
                >
                  <Text style={styles.sectionLink}>History</Text>
                </TouchableOpacity>
              ) : completedSessions.length > PREVIEW_LIMIT &&
                showAllCompleted ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => setShowAllCompleted(false)}
                >
                  <Text style={styles.sectionLink}>Show Less</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.sectionCards}>
              {completedSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No completed sessions.</Text>
                </View>
              ) : (
                displayedCompleted.map((session) => (
                  <CompletedSessionCard key={session.id} session={session} />
                ))
              )}
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
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnActive: {
    backgroundColor: Colors.safety,
  },

  /* ── Filter chips ── */
  filterRow: {
    flexDirection: "row",
    backgroundColor: Colors.slate,
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

  /* ── Stats row ── */
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
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

  /* ── Section ── */
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },
  sectionCards: {
    paddingHorizontal: 16,
    gap: 12,
  },

  /* ── Active session card ── */
  activeCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.boven,
    padding: 16,
    gap: 14,
    shadowColor: Colors.boven,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  cardName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  cardDate: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inProgressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.bovenBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inProgressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.boven,
  },
  inProgressText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.boven,
  },

  /* Progress */
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressPct: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 12,
    color: Colors.boven,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.gravelLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.boven,
  },

  /* Card meta */
  cardMetaRow: {
    flexDirection: "row",
    gap: 16,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* Continue button */
  continueButton: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.card,
  },

  /* ── Completed session card ── */
  completedCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
  },
  completedTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  completedInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  completedScoreBlock: {
    alignItems: "center",
  },
  completedScore: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  completedScoreLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  /* Completed meta row */
  completedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  completedBadge: {
    marginLeft: "auto",
    backgroundColor: Colors.leafBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.leaf,
  },

  /* Score bar */
  scoreBarContainer: {
    paddingTop: 2,
  },
  scoreBarTrack: {
    height: 6,
    flexDirection: "row",
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: Colors.gravelLight,
  },
  scoreBarSegment: {
    height: 6,
  },

  /* ── Empty state ── */
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
