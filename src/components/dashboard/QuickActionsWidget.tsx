import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import Svg, { Rect, Line, Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import type { DashboardData } from "@/types";

interface QuickActionsWidgetProps {
  data: DashboardData | null;
}

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function CalendarPlusIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.sky}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
      <Line x1="12" y1="14" x2="12" y2="18" />
      <Line x1="10" y1="16" x2="14" y2="16" />
    </Svg>
  );
}

function StarIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.sky}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function PackageIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.sky}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </Svg>
  );
}

function ActionButton({ label, icon, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function QuickActionsWidget({ data }: QuickActionsWidgetProps) {
  return (
    <View style={styles.row}>
      <ActionButton
        label="Plan Roast"
        icon={<CalendarPlusIcon />}
        onPress={() => router.push("/planning/create")}
      />
      <ActionButton
        label="Log Quality"
        icon={<StarIcon />}
        onPress={() => router.push("/quality/create")}
      />
      <ActionButton
        label="Check Stock"
        icon={<PackageIcon />}
        onPress={() => router.push("/(tabs)/inventory")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.text,
    marginTop: 8,
  },
});
