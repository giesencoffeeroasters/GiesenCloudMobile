import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Rect, Line, Path, Circle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";
import { useLiveStore, DeviceReading } from "@/stores/liveStore";

interface DeviceMeta {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
}

/* ─── Pulsing status dot ─── */
function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.statusDot, { backgroundColor: color, opacity }]}
    />
  );
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: DeviceReading["status"] }) {
  const config: Record<
    DeviceReading["status"],
    { bg: string; text: string; dot: string }
  > = {
    Roasting: { bg: Colors.leafBg, text: Colors.leaf, dot: Colors.leaf },
    Replaying: { bg: Colors.skyBg, text: Colors.sky, dot: Colors.sky },
    Recording: { bg: Colors.sunBg, text: Colors.sun, dot: Colors.sun },
    Connected: {
      bg: "rgba(122,122,118,0.12)",
      text: Colors.textSecondary,
      dot: Colors.textSecondary,
    },
    Disconnected: {
      bg: Colors.trafficBg,
      text: Colors.traffic,
      dot: Colors.traffic,
    },
  };
  const c = config[status];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {status !== "Disconnected" ? (
        <PulsingDot color={c.dot} />
      ) : (
        <View style={[styles.statusDot, { backgroundColor: c.dot }]} />
      )}
      <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

/* ─── Metric cell ─── */
function MetricCell({
  label,
  value,
  unit,
  iconColor,
  iconPath,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  iconColor: string;
  iconPath: string;
}) {
  const display = value != null ? value.toFixed(1) : "-";

  return (
    <View style={styles.metricCell}>
      <View style={styles.metricHeader}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d={iconPath}
            stroke={iconColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{display}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.machineCard, { opacity }]}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSubtitle} />
      <View style={styles.cardDivider} />
      <View style={styles.metricsGrid}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={styles.skeletonMetric} />
        ))}
      </View>
    </Animated.View>
  );
}

/* ─── Machine card ─── */
function MachineCard({
  meta,
  live,
}: {
  meta: DeviceMeta;
  live: DeviceReading | undefined;
}) {
  const status = live?.status ?? "Disconnected";
  const readings = live?.readings ?? {};

  // SVG icon paths (simple representations)
  const icons = {
    beans: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
    air: "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2",
    power: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    ror: "M2 12h4l3-9 6 18 3-9h4",
    speed: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-14v4l3 3",
    pressure: "M12 2v10l4.5 2.6M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z",
  };

  return (
    <View style={styles.machineCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {meta.name}
            </Text>
            <Text style={styles.cardModel}>
              {meta.model ?? "Unknown Model"}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>
        {live?.selectedProfile && status === "Roasting" ? (
          <View style={styles.profileBadge}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke={Colors.sky}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.profileBadgeText} numberOfLines={1}>
              {live.selectedProfile.name}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      {/* Metrics grid */}
      <View style={styles.metricsGrid}>
        <MetricCell
          label="Bean Temp"
          value={readings.beans}
          unit="°C"
          iconColor={Colors.traffic}
          iconPath={icons.beans}
        />
        <MetricCell
          label="Air Temp"
          value={readings.air}
          unit="°C"
          iconColor={Colors.sky}
          iconPath={icons.air}
        />
        <MetricCell
          label="Power"
          value={readings.power}
          unit="%"
          iconColor={Colors.leaf}
          iconPath={icons.power}
        />
        <MetricCell
          label="RoR"
          value={readings.ror}
          unit="°C/30s"
          iconColor={Colors.sun}
          iconPath={icons.ror}
        />
        <MetricCell
          label="Drum Speed"
          value={readings.speed}
          unit="Hz"
          iconColor={Colors.boven}
          iconPath={icons.speed}
        />
        <MetricCell
          label="Pressure"
          value={readings.pressure}
          unit="Pa"
          iconColor={Colors.grape}
          iconPath={icons.pressure}
        />
      </View>
    </View>
  );
}

/* ─── Main screen ─── */
export default function GiesenLiveScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [devicesMeta, setDevicesMeta] = useState<DeviceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const liveDevices = useLiveStore((s) => s.devices);
  const isConnected = useLiveStore((s) => s.isConnected);

  const fetchDevices = useCallback(async (isRefresh = false) => {
    try {
      const response = await apiClient.get("/devices");
      const data = response.data.data ?? response.data ?? [];
      setDevicesMeta(
        data.map((d: any) => ({
          id: d.id ?? d.machine_id ?? String(d),
          name: d.name ?? "Unknown Roaster",
          model: d.model ?? null,
          serial_number: d.serial_number ?? null,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [fetchDevices, user?.current_team?.id])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevices(true);
  }, [fetchDevices]);

  // Merge metadata with live readings — show all known devices
  const allMachineIds = new Set([
    ...devicesMeta.map((d) => d.id),
    ...liveDevices.keys(),
  ]);

  const mergedDevices = Array.from(allMachineIds).map((id) => {
    const meta = devicesMeta.find((d) => d.id === id) ?? {
      id,
      name: `Roaster ${id}`,
      model: null,
      serial_number: null,
    };
    const live = liveDevices.get(id);
    return { meta, live };
  });

  const activeCount = mergedDevices.filter(
    (d) => d.live && d.live.status !== "Disconnected"
  ).length;

  return (
    <View style={styles.screen}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Giesen Live</Text>
              <Text style={styles.headerSubtitle}>
                {isConnected
                  ? activeCount > 0
                    ? `${activeCount} roaster${activeCount !== 1 ? "s" : ""} active`
                    : "Listening for roasters"
                  : "Connecting..."}
              </Text>
            </View>
          </View>
          {isConnected ? (
            <View style={styles.connectedIndicator}>
              <PulsingDot color={Colors.leaf} />
            </View>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
        >
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : mergedDevices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
              <Rect
                x="2"
                y="3"
                width="20"
                height="14"
                rx="2"
                ry="2"
                stroke={Colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Line
                x1="8"
                y1="21"
                x2="16"
                y2="21"
                stroke={Colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Line
                x1="12"
                y1="17"
                x2="12"
                y2="21"
                stroke={Colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.emptyTitle}>No roasters found</Text>
          <Text style={styles.emptySubtitle}>
            Your team does not have any roasting equipment registered yet. Add
            devices through giesen.cloud to see them here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textSecondary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {mergedDevices.map(({ meta, live }) => (
            <MachineCard key={meta.id} meta={meta} live={live} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollView: {
    flex: 1,
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBox: {
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
  connectedIndicator: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- List -- */
  listContent: {
    padding: 16,
    gap: 12,
  },

  /* -- Machine card -- */
  machineCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 17,
    color: Colors.text,
  },
  cardModel: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },

  /* -- Status badge -- */
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* -- Profile badge -- */
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: Colors.skyBg,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  profileBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.sky,
    maxWidth: 200,
  },

  /* -- Metrics grid -- */
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCell: {
    width: "48%",
    backgroundColor: Colors.bg,
    borderRadius: 8,
    padding: 12,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  metricLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  metricValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    color: Colors.text,
  },
  metricUnit: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  /* -- Skeleton -- */
  skeletonTitle: {
    width: 160,
    height: 18,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 100,
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonMetric: {
    width: "48%",
    height: 80,
    backgroundColor: Colors.bg,
    borderRadius: 8,
  },

  /* -- Empty state -- */
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
