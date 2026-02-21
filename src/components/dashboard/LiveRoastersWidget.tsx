import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import type { DashboardData, LiveRoaster } from "@/types";

interface LiveRoastersWidgetProps {
  data: DashboardData | null;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function PulsingDot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[styles.pulsingDot, { opacity: pulseAnim }]}
    />
  );
}

function GradientProgressBar() {
  return (
    <View style={styles.progressBarBackground}>
      <Svg width="100%" height={6}>
        <Defs>
          <SvgLinearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={Colors.boven} />
            <Stop offset="1" stopColor={Colors.sun} />
          </SvgLinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width="100%"
          height={6}
          rx={3}
          ry={3}
          fill="url(#progressGrad)"
        />
      </Svg>
    </View>
  );
}

interface RoasterCardProps {
  roaster: LiveRoaster;
}

function RoasterCard({ roaster }: RoasterCardProps) {
  const isActive = roaster.bean_temp > 0;

  return (
    <View
      style={[
        styles.roasterCard,
        isActive && styles.roasterCardActive,
      ]}
    >
      {/* Header row: machine info + status */}
      <View style={styles.roasterHeader}>
        <View style={styles.roasterInfo}>
          <Text style={styles.machineName}>{roaster.device_name}</Text>
          <Text style={styles.profileName} numberOfLines={1}>
            {roaster.profile_name}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          {isActive ? (
            <>
              <PulsingDot />
              <Text style={styles.statusTextActive}>ROASTING</Text>
            </>
          ) : (
            <Text style={styles.statusTextIdle}>IDLE</Text>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>BEAN TEMP</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{roaster.bean_temp}</Text>
            <Text style={styles.statUnit}>{"\u00B0C"}</Text>
          </View>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>DURATION</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>
              {formatDuration(roaster.duration)}
            </Text>
          </View>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>RoR</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{roaster.ror}</Text>
            <Text style={styles.statUnit}>{"\u00B0/m"}</Text>
          </View>
        </View>
      </View>

      {/* Progress bar for active roasters */}
      {isActive && <GradientProgressBar />}
    </View>
  );
}

export function LiveRoastersWidget({ data }: LiveRoastersWidgetProps) {
  const roasters = data?.live_roasters ?? [];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Roasters</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/giesen-live")}
        >
          <Text style={styles.giesenLiveLink}>Giesen Live</Text>
        </TouchableOpacity>
      </View>
      {roasters.length > 0 ? (
        <View style={styles.roasterList}>
          {roasters.map((roaster) => (
            <RoasterCard key={roaster.device_id} roaster={roaster} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No roasters connected</Text>
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
  giesenLiveLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },
  roasterList: {
    gap: 10,
  },
  roasterCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 14,
  },
  roasterCardActive: {
    borderColor: Colors.boven,
  },
  roasterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  roasterInfo: {
    flex: 1,
    marginRight: 12,
  },
  machineName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  profileName: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.boven,
  },
  statusTextActive: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.boven,
    letterSpacing: 0.5,
  },
  statusTextIdle: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
  },
  statColumn: {
    flex: 1,
  },
  statLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 18,
    color: Colors.text,
  },
  statUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gravelLight,
    overflow: "hidden",
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
    color: Colors.textTertiary,
  },
});
