import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import { ProfilerDeviceDetail, DeviceRoast } from "@/types/index";

function formatHours(hours: number | null): string {
  if (hours == null) return "--";
  return hours.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOnline(lastSyncedAt: string | null): boolean {
  if (!lastSyncedAt) return false;
  const lastSync = new Date(lastSyncedAt);
  const now = new Date();
  const diffHours = (now.getTime() - lastSync.getTime()) / 3600000;
  return diffHours < 24;
}

export default function EquipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [device, setDevice] = useState<ProfilerDeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDevice() {
      try {
        const response = await apiClient.get(`/equipment/${id}`);
        setDevice(response.data.data);
      } catch (err) {
        console.error("Failed to fetch device:", err);
        setError("Failed to load device details.");
      } finally {
        setLoading(false);
      }
    }

    fetchDevice();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() => router.navigate("/(tabs)/equipment")}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <View style={styles.logoBox}>
                <GiesenLogo size={18} color={Colors.text} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Equipment</Text>
                <Text style={styles.headerSubtitle}>Device Details</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  if (error || !device) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() => router.navigate("/(tabs)/equipment")}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <View style={styles.logoBox}>
                <GiesenLogo size={18} color={Colors.text} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Equipment</Text>
                <Text style={styles.headerSubtitle}>Device Details</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error ?? "Device not found."}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.navigate("/(tabs)/equipment")}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const online = isOnline(device.last_synced_at);
  const subs = device.subscriptions;

  const activeFeatures: { label: string; active: boolean }[] = [
    { label: "Giesen Live", active: subs?.giesen_live ?? false },
    { label: "Roast Planning", active: subs?.roast_planning ?? false },
    { label: "Inventory", active: subs?.inventory ?? false },
    { label: "Profiler Compare", active: subs?.profiler_compare ?? false },
    { label: "Profiler Storage", active: subs?.profiler_storage ?? false },
    { label: "Profiler", active: subs?.profiler ?? false },
  ];

  return (
    <View style={styles.screen}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.navigate("/(tabs)/equipment")}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M12 19l-7-7 7-7"
                  stroke="#fff"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {device.name}
              </Text>
              <Text style={styles.headerSubtitle}>{device.model}</Text>
            </View>
            <View
              style={[
                styles.headerStatusBadge,
                {
                  backgroundColor: online
                    ? Colors.leafBg
                    : "rgba(165, 165, 160, 0.12)",
                },
              ]}
            >
              <View
                style={[
                  styles.headerStatusDot,
                  {
                    backgroundColor: online ? Colors.leaf : Colors.textTertiary,
                  },
                ]}
              />
              <Text
                style={[
                  styles.headerStatusText,
                  { color: online ? Colors.leaf : Colors.textTertiary },
                ]}
              >
                {online ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatHours(device.roasting_hours)}</Text>
            <Text style={styles.statLabel}>Roasting Hours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatHours(device.running_hours)}</Text>
            <Text style={styles.statLabel}>Running Hours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{device.roasts_count ?? 0}</Text>
            <Text style={styles.statLabel}>Total Roasts</Text>
          </View>
        </View>

        {/* Device Info Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Device Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model</Text>
            <Text style={styles.detailValue}>{device.model ?? "N/A"}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Serial Number</Text>
            <Text style={styles.detailValueMono}>
              {device.serial_number ?? "N/A"}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Version</Text>
            <Text style={styles.detailValue}>{device.version ?? "N/A"}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>IP Address</Text>
            <Text style={styles.detailValueMono}>
              {device.ip_address ?? "N/A"}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Connection</Text>
            <Text style={styles.detailValue}>
              {device.connection_type ?? "N/A"}
            </Text>
          </View>

          {device.last_synced_at ? (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Synced</Text>
                <Text style={styles.detailValue}>
                  {formatDate(device.last_synced_at)}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Subscription Status */}
        {subs ? (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Subscriptions</Text>
            <View style={styles.featureList}>
              {activeFeatures.map((feature) => (
                <View key={feature.label} style={styles.featureRow}>
                  <View style={styles.featureIconBox}>
                    {feature.active ? (
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M20 6L9 17l-5-5"
                          stroke={Colors.leaf}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    ) : (
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M18 6L6 18M6 6l12 12"
                          stroke={Colors.textTertiary}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.featureLabel,
                      !feature.active && styles.featureLabelInactive,
                    ]}
                  >
                    {feature.label}
                  </Text>
                  <View
                    style={[
                      styles.featureBadge,
                      {
                        backgroundColor: feature.active
                          ? Colors.leafBg
                          : "rgba(165, 165, 160, 0.12)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.featureBadgeText,
                        {
                          color: feature.active
                            ? Colors.leaf
                            : Colors.textTertiary,
                        },
                      ]}
                    >
                      {feature.active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recent Roasts */}
        {device.latest_roasts && device.latest_roasts.length > 0 ? (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Recent Roasts</Text>
            {device.latest_roasts.map((roast: DeviceRoast, index: number) => (
              <View key={roast.id}>
                {index > 0 ? <View style={styles.detailDivider} /> : null}
                <TouchableOpacity
                  style={styles.roastRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/roasts/${roast.id}` as any)}
                >
                  <View style={styles.roastInfo}>
                    <Text style={styles.roastName} numberOfLines={1}>
                      {roast.profile_name ?? "Unnamed Roast"}
                    </Text>
                    <Text style={styles.roastMeta}>
                      {roast.roasted_at ? formatDate(roast.roasted_at) : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.roastStats}>
                    {roast.duration != null ? (
                      <Text style={styles.roastStatText}>
                        {formatDuration(roast.duration)}
                      </Text>
                    ) : null}
                    {roast.bean_temp_end != null ? (
                      <Text style={styles.roastStatText}>
                        {Math.round(roast.bean_temp_end)}C
                      </Text>
                    ) : null}
                  </View>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 18l6-6-6-6"
                      stroke={Colors.textTertiary}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Recent Roasts</Text>
            <Text style={styles.noRoastsText}>
              No roasts recorded for this device yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
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
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },
  headerStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  headerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerStatusText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },

  /* -- Loading / Error -- */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: "#ffffff",
  },

  /* -- Content -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },

  /* -- Stats row -- */
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },

  /* -- Details card -- */
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  detailValueMono: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },

  /* -- Features / subscriptions -- */
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  featureLabelInactive: {
    color: Colors.textTertiary,
  },
  featureBadge: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featureBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
  },

  /* -- Recent roasts -- */
  roastRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
  },
  roastInfo: {
    flex: 1,
  },
  roastName: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  roastMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  roastStats: {
    flexDirection: "row",
    gap: 12,
  },
  roastStatText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  noRoastsText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
