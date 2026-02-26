import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import type { DiFluidConnectionStatus } from "@/types/index";

const STATUS_CONFIG: Record<
  DiFluidConnectionStatus,
  { label: string; color: string; bg: string }
> = {
  disconnected: { label: "Disconnected", color: Colors.textTertiary, bg: Colors.gravelLight },
  scanning: { label: "Scanning", color: Colors.sky, bg: Colors.skyBg },
  connecting: { label: "Connecting", color: Colors.sun, bg: Colors.sunBg },
  connected: { label: "Connected", color: Colors.leaf, bg: Colors.leafBg },
  measuring: { label: "Measuring", color: Colors.boven, bg: Colors.bovenBg },
};

export function ConnectionBadge({ status }: { status: DiFluidConnectionStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },
});
