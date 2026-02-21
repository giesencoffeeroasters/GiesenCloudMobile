import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import type { DashboardData } from "@/types";

interface QuickStatsWidgetProps {
  data: DashboardData | null;
}

interface StatCardProps {
  title: string;
  value: number;
  stripeColor: string;
  onPress: () => void;
}

function StatCard({ title, value, stripeColor, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.statStripe, { backgroundColor: stripeColor }]} />
      <View style={styles.statCardContent}>
        <Text style={[styles.statValue, { color: stripeColor }]}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function QuickStatsWidget({ data }: QuickStatsWidgetProps) {
  return (
    <View style={styles.statsRow}>
      <StatCard
        title="Today's Roasts"
        value={data?.today_roasts ?? 0}
        stripeColor={Colors.sky}
        onPress={() => router.push("/(tabs)/planning")}
      />
      <StatCard
        title="Active Roasters"
        value={data?.active_roasters ?? 0}
        stripeColor={Colors.leaf}
        onPress={() => router.push("/(tabs)/equipment")}
      />
      <StatCard
        title="Low Stock"
        value={data?.low_stock_count ?? 0}
        stripeColor={Colors.traffic}
        onPress={() => router.push("/(tabs)/inventory")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  statStripe: {
    height: 3,
    width: "100%",
  },
  statCardContent: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 4,
  },
  statTitle: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
