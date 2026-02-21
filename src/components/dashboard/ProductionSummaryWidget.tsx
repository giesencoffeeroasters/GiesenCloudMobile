import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import type { DashboardData } from "@/types";

interface ProductionSummaryWidgetProps {
  data: DashboardData | null;
}

export function ProductionSummaryWidget({ data }: ProductionSummaryWidgetProps) {
  const completedRoasts = data?.schedule?.filter(r => r.status === "completed") ?? [];
  const totalKg = completedRoasts.reduce((sum, r) => sum + r.batch_size, 0);
  const batchCount = completedRoasts.length;
  const avgBatch = batchCount > 0 ? totalKg / batchCount : 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Production Summary</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>KG ROASTED</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{totalKg}</Text>
              <Text style={styles.statUnit}>kg</Text>
            </View>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>BATCHES</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{batchCount}</Text>
            </View>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>AVG BATCH</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{avgBatch.toFixed(1)}</Text>
              <Text style={styles.statUnit}>kg</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    color: Colors.text,
  },
  statUnit: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
});
