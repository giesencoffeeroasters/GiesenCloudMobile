import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import type { DashboardData } from "@/types";

interface InventoryAlertsWidgetProps {
  data: DashboardData | null;
}

interface AlertItem {
  id: number;
  name: string;
  current_kg: number;
  threshold_kg: number;
  severity: "low" | "critical";
}

const MOCK_ALERTS: AlertItem[] = [
  { id: 1, name: "Brazil Santos Natural", current_kg: 38, threshold_kg: 50, severity: "low" },
  { id: 2, name: "Colombia Huila", current_kg: 12, threshold_kg: 40, severity: "critical" },
  { id: 3, name: "Ethiopia Sidamo", current_kg: 22, threshold_kg: 30, severity: "low" },
];

function getSeverityStyle(severity: "low" | "critical"): {
  color: string;
  bg: string;
  label: string;
} {
  if (severity === "critical") {
    return {
      color: Colors.traffic,
      bg: Colors.trafficBg,
      label: "CRITICAL",
    };
  }
  return {
    color: Colors.sun,
    bg: Colors.sunBg,
    label: "LOW",
  };
}

interface AlertCardProps {
  item: AlertItem;
}

function AlertCard({ item }: AlertCardProps) {
  const severity = getSeverityStyle(item.severity);

  return (
    <TouchableOpacity
      style={styles.alertCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/inventory/${item.id}`)}
    >
      <View style={styles.alertInfo}>
        <Text style={styles.alertName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.alertQuantity}>
          {item.current_kg} / {item.threshold_kg} kg
        </Text>
      </View>
      <View style={[styles.severityBadge, { backgroundColor: severity.bg }]}>
        <Text style={[styles.severityText, { color: severity.color }]}>
          {severity.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function InventoryAlertsWidget({ data }: InventoryAlertsWidgetProps) {
  const alerts = MOCK_ALERTS;
  const hasNoAlerts = data?.low_stock_count === 0 && alerts.length === 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Inventory Alerts</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/inventory")}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>
      {hasNoAlerts ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>All stock levels healthy</Text>
        </View>
      ) : (
        <View style={styles.alertList}>
          {alerts.map((item) => (
            <AlertCard key={item.id} item={item} />
          ))}
        </View>
      )}
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
  viewAllLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },
  alertList: {
    gap: 10,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  alertQuantity: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  severityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    textTransform: "uppercase",
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.leaf,
  },
});
