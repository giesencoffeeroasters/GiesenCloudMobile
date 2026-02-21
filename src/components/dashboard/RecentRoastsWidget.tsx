import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import type { DashboardData } from "@/types";

interface RecentRoastsWidgetProps {
  data: DashboardData | null;
}

interface MockRoast {
  id: number;
  profile_name: string;
  device_name: string;
  duration: number;
  bean_temp_end: number;
  batch_size: number;
}

const MOCK_ROASTS: MockRoast[] = [
  {
    id: 1,
    profile_name: "Ethiopia Yirgacheffe",
    device_name: "W15A",
    duration: 756,
    bean_temp_end: 205,
    batch_size: 12,
  },
  {
    id: 2,
    profile_name: "Colombia Huila Supremo",
    device_name: "W15A",
    duration: 812,
    bean_temp_end: 210,
    batch_size: 15,
  },
  {
    id: 3,
    profile_name: "Guatemala Antigua",
    device_name: "W6A",
    duration: 690,
    bean_temp_end: 198,
    batch_size: 6,
  },
];

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

interface RoastCardProps {
  item: MockRoast;
}

function RoastCard({ item }: RoastCardProps) {
  return (
    <TouchableOpacity
      style={styles.roastCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/roasts/${item.id}`)}
    >
      <View style={styles.roastInfo}>
        <Text style={styles.roastProfileName} numberOfLines={1}>
          {item.profile_name}
        </Text>
        <Text style={styles.roastMeta}>
          {item.device_name} {"\u00B7"} {item.batch_size} kg
        </Text>
      </View>
      <View style={styles.roastData}>
        <Text style={styles.roastDuration}>{formatDuration(item.duration)}</Text>
        <Text style={styles.roastTemp}>{item.bean_temp_end}{"\u00B0"}C</Text>
      </View>
    </TouchableOpacity>
  );
}

export function RecentRoastsWidget({ data }: RecentRoastsWidgetProps) {
  const roasts = MOCK_ROASTS;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Roasts</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/roasts")}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.roastList}>
        {roasts.map((item) => (
          <RoastCard key={item.id} item={item} />
        ))}
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
  viewAllLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },
  roastList: {
    gap: 10,
  },
  roastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  roastInfo: {
    flex: 1,
  },
  roastProfileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  roastMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roastData: {
    alignItems: "flex-end",
  },
  roastDuration: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 2,
  },
  roastTemp: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
