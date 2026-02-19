import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Colors } from "@/constants/colors";

interface CuppingAttribute {
  label: string;
  score: number;
}

interface ActiveSession {
  id: number;
  name: string;
  date: string;
  sampleCount: number;
  samplesScored: number;
}

interface CompletedSession {
  id: number;
  name: string;
  date: string;
  overallScore: number;
  attributes: CuppingAttribute[];
}

const MOCK_SESSIONS: {
  active: ActiveSession[];
  completed: CompletedSession[];
} = {
  active: [
    {
      id: 1,
      name: "Ethiopia Lot Evaluation",
      date: "Feb 19, 2026",
      sampleCount: 6,
      samplesScored: 4,
    },
    {
      id: 2,
      name: "New Supplier Samples",
      date: "Feb 18, 2026",
      sampleCount: 8,
      samplesScored: 2,
    },
  ],
  completed: [
    {
      id: 3,
      name: "House Blend QC - Batch 42",
      date: "Feb 15, 2026",
      overallScore: 86.5,
      attributes: [
        { label: "Aroma", score: 8.2 },
        { label: "Flavor", score: 8.5 },
        { label: "Acidity", score: 8.8 },
        { label: "Body", score: 8.0 },
      ],
    },
    {
      id: 4,
      name: "Colombia Supremo Arrival",
      date: "Feb 12, 2026",
      overallScore: 84.0,
      attributes: [
        { label: "Aroma", score: 8.0 },
        { label: "Flavor", score: 8.2 },
        { label: "Acidity", score: 8.5 },
        { label: "Body", score: 7.8 },
      ],
    },
    {
      id: 5,
      name: "Kenya AA Premium",
      date: "Feb 8, 2026",
      overallScore: 91.2,
      attributes: [
        { label: "Aroma", score: 9.0 },
        { label: "Flavor", score: 9.2 },
        { label: "Acidity", score: 9.5 },
        { label: "Body", score: 8.8 },
      ],
    },
  ],
};

function getScoreColor(score: number): string {
  if (score >= 90) {
    return Colors.leaf;
  }
  if (score >= 85) {
    return Colors.sky;
  }
  if (score >= 80) {
    return Colors.sun;
  }
  return Colors.traffic;
}

const totalSessions =
  MOCK_SESSIONS.active.length + MOCK_SESSIONS.completed.length;
const avgScore =
  MOCK_SESSIONS.completed.reduce((sum, s) => sum + s.overallScore, 0) /
  MOCK_SESSIONS.completed.length;
const samplesThisMonth = MOCK_SESSIONS.active.reduce(
  (sum, s) => sum + s.sampleCount,
  0
) + MOCK_SESSIONS.completed.reduce((sum, s) => sum + s.attributes.length, 0);

export default function QualityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Quality</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: getScoreColor(avgScore) }]}>
              {avgScore.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{samplesThisMonth}</Text>
            <Text style={styles.statLabel}>Samples</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          <View style={styles.sectionCards}>
            {MOCK_SESSIONS.active.map((session) => {
              const progress = session.samplesScored / session.sampleCount;

              return (
                <View key={session.id} style={styles.activeCard}>
                  <View style={styles.activeCardHeader}>
                    <View style={styles.activeCardInfo}>
                      <Text style={styles.sessionName}>{session.name}</Text>
                      <Text style={styles.sessionDate}>{session.date}</Text>
                    </View>
                    <Text style={styles.sampleCount}>
                      {session.samplesScored}/{session.sampleCount}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.continueButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Sessions</Text>
          <View style={styles.sectionCards}>
            {MOCK_SESSIONS.completed.map((session) => {
              const scoreColor = getScoreColor(session.overallScore);

              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.completedCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.completedCardHeader}>
                    <View style={styles.completedCardInfo}>
                      <Text style={styles.sessionName}>{session.name}</Text>
                      <Text style={styles.sessionDate}>{session.date}</Text>
                    </View>
                    <View style={styles.scoreContainer}>
                      <Text style={[styles.overallScore, { color: scoreColor }]}>
                        {session.overallScore.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.attributeGrid}>
                    {session.attributes.map((attr) => (
                      <View key={attr.label} style={styles.attributeItem}>
                        <Text style={styles.attributeLabel}>{attr.label}</Text>
                        <Text style={styles.attributeScore}>
                          {attr.score.toFixed(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "DMSans-Bold",
    fontSize: 20,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionCards: {
    paddingHorizontal: 20,
    gap: 10,
  },
  activeCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  activeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  activeCardInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  sessionName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  sessionDate: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sampleCount: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    width: "100%",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.bg,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.sky,
    borderRadius: 3,
  },
  continueButton: {
    backgroundColor: Colors.slate,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  continueButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.card,
  },
  completedCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  completedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  completedCardInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  scoreContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  overallScore: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    lineHeight: 32,
  },
  attributeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  attributeItem: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2,
  },
  attributeLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  attributeScore: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
});
