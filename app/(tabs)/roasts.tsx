import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { Colors } from "@/constants/colors";

interface Roast {
  id: number;
  profile_name: string;
  green_coffee: string;
  device_name: string;
  roasted_at: string;
  bean_temp_end: number;
  duration: number;
  ror: number;
  score: number | null;
}

const MOCK_ROASTS: Roast[] = [
  {
    id: 1,
    profile_name: "Ethiopia Yirgacheffe Light",
    green_coffee: "Ethiopia Yirgacheffe Grade 1",
    device_name: "W6A",
    roasted_at: "2026-02-19T09:30:00Z",
    bean_temp_end: 202.5,
    duration: 654,
    ror: 8.2,
    score: 88,
  },
  {
    id: 2,
    profile_name: "Colombia Medium",
    green_coffee: "Colombia Supremo Huila",
    device_name: "W15A",
    roasted_at: "2026-02-19T08:15:00Z",
    bean_temp_end: 210.3,
    duration: 720,
    ror: 7.5,
    score: 79,
  },
  {
    id: 3,
    profile_name: "Brazil Dark Roast",
    green_coffee: "Brazil Santos Natural",
    device_name: "W6A",
    roasted_at: "2026-02-18T14:00:00Z",
    bean_temp_end: 221.8,
    duration: 810,
    ror: 6.1,
    score: 72,
  },
  {
    id: 4,
    profile_name: "Guatemala Espresso",
    green_coffee: "Guatemala Antigua SHB",
    device_name: "W30A",
    roasted_at: "2026-02-18T10:45:00Z",
    bean_temp_end: 214.0,
    duration: 745,
    ror: 7.8,
    score: 91,
  },
  {
    id: 5,
    profile_name: "Kenya AA Filter",
    green_coffee: "Kenya AA Nyeri",
    device_name: "W15A",
    roasted_at: "2026-02-17T16:20:00Z",
    bean_temp_end: 198.6,
    duration: 615,
    ror: 9.0,
    score: null,
  },
];

const FILTER_OPTIONS = ["All", "Today", "This Week", "This Month"] as const;

type FilterOption = (typeof FILTER_OPTIONS)[number];

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${diffDays}d ago`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getScoreColor(score: number): string {
  if (score > 85) {
    return Colors.leaf;
  }
  if (score > 75) {
    return Colors.sun;
  }
  return Colors.traffic;
}

function StatsRow() {
  const totalRoasts = MOCK_ROASTS.length;
  const scoredRoasts = MOCK_ROASTS.filter((r) => r.score !== null);
  const avgScore =
    scoredRoasts.length > 0
      ? scoredRoasts.reduce((sum, r) => sum + (r.score ?? 0), 0) /
        scoredRoasts.length
      : 0;
  const todayCount = MOCK_ROASTS.filter((r) => {
    const roastDate = new Date(r.roasted_at).toDateString();
    return roastDate === new Date().toDateString();
  }).length;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{totalRoasts}</Text>
        <Text style={styles.statLabel}>Total Roasts</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{avgScore.toFixed(1)}</Text>
        <Text style={styles.statLabel}>Avg Score</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{todayCount}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </View>
    </View>
  );
}

interface RoastCardProps {
  roast: Roast;
}

function RoastCard({ roast }: RoastCardProps) {
  return (
    <View style={styles.roastCard}>
      <View style={styles.roastCardHeader}>
        <View style={styles.roastCardHeaderText}>
          <Text style={styles.profileName}>{roast.profile_name}</Text>
          <Text style={styles.greenCoffee}>{roast.green_coffee}</Text>
        </View>
        {roast.score !== null && (
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: getScoreColor(roast.score) },
            ]}
          >
            <Text style={styles.scoreBadgeText}>{roast.score}</Text>
          </View>
        )}
      </View>
      <View style={styles.roastMeta}>
        <Text style={styles.deviceName}>{roast.device_name}</Text>
        <Text style={styles.metaDot}>{"\u00B7"}</Text>
        <Text style={styles.timeAgo}>{getTimeAgo(roast.roasted_at)}</Text>
      </View>
      <View style={styles.roastStats}>
        <View style={styles.roastStat}>
          <Text style={styles.roastStatLabel}>Bean Temp</Text>
          <Text style={styles.roastStatValue}>
            {roast.bean_temp_end.toFixed(1)}{"\u00B0C"}
          </Text>
        </View>
        <View style={styles.roastStat}>
          <Text style={styles.roastStatLabel}>Duration</Text>
          <Text style={styles.roastStatValue}>
            {formatDuration(roast.duration)}
          </Text>
        </View>
        <View style={styles.roastStat}>
          <Text style={styles.roastStatLabel}>RoR</Text>
          <Text style={styles.roastStatValue}>
            {roast.ror.toFixed(1)}{"\u00B0/min"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RoastsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Roasts</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonIcon}>{"\u2699"}</Text>
        </TouchableOpacity>
      </View>

      <StatsRow />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContainer}
        style={styles.filterChipsScroll}
      >
        {FILTER_OPTIONS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={MOCK_ROASTS}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RoastCard roast={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: Colors.text,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonIcon: {
    fontSize: 20,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  filterChipsScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
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
    color: Colors.card,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  roastCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  roastCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  roastCardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  profileName: {
    fontFamily: "DMSans-Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  greenCoffee: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontFamily: "DMSans-Bold",
    fontSize: 14,
    color: Colors.card,
  },
  roastMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  deviceName: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  metaDot: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  timeAgo: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  roastStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    gap: 12,
  },
  roastStat: {
    flex: 1,
    alignItems: "center",
  },
  roastStatLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  roastStatValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 14,
    color: Colors.text,
  },
});
