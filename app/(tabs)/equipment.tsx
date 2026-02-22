import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";
import { ProfilerDevice } from "@/types/index";

function isOnline(device: ProfilerDevice): boolean {
  if (!device.last_synced_at) return false;
  const lastSync = new Date(device.last_synced_at);
  const now = new Date();
  const diffHours = (now.getTime() - lastSync.getTime()) / 3600000;
  return diffHours < 24;
}

function formatHours(hours: number | null): string {
  if (hours == null) return "--";
  return hours.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function EquipmentScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [devices, setDevices] = useState<ProfilerDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async (isRefresh: boolean = false) => {
    try {
      setError(null);
      const response = await apiClient.get("/equipment");
      setDevices(response.data.data ?? []);
    } catch (err) {
      console.error("Failed to fetch equipment:", err);
      setError("Failed to load equipment.");
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

  const renderDevice = useCallback(({ item }: { item: ProfilerDevice }) => {
    const online = isOnline(item);

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/equipment/${item.id}`)}
      >
        <View style={styles.deviceHeader}>
          <View style={styles.deviceTitleRow}>
            <Text style={styles.deviceName} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: online ? Colors.leaf : Colors.textTertiary },
              ]}
            />
          </View>
          <View style={styles.deviceModelRow}>
            <Text style={styles.deviceModel}>{item.model ?? "Unknown Model"}</Text>
            {item.subscription_tier ? (
              <View
                style={[
                  styles.tierBadge,
                  item.subscription_tier === "Industrial"
                    ? styles.tierBadgeIndustrial
                    : item.subscription_tier === "Speciality"
                    ? styles.tierBadgeSpeciality
                    : styles.tierBadgeBasic,
                ]}
              >
                <Text
                  style={[
                    styles.tierBadgeText,
                    item.subscription_tier === "Industrial"
                      ? styles.tierBadgeTextIndustrial
                      : item.subscription_tier === "Speciality"
                      ? styles.tierBadgeTextSpeciality
                      : styles.tierBadgeTextBasic,
                  ]}
                >
                  {item.subscription_tier}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.deviceDivider} />

        <View style={styles.deviceDetails}>
          <View style={styles.detailItem}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2v10l4.5 2.6"
                stroke={Colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke={Colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.detailLabel}>
              {formatHours(item.roasting_hours)}h
            </Text>
          </View>

          {item.serial_number ? (
            <View style={styles.detailItem}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.detailLabel} numberOfLines={1}>
                {item.serial_number}
              </Text>
            </View>
          ) : null}

          <View style={styles.roastBadge}>
            <Text style={styles.roastBadgeText}>
              {item.roasts_count ?? 0} roasts
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
              stroke={Colors.textTertiary}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke={Colors.textTertiary}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={styles.emptyTitle}>No equipment found</Text>
        <Text style={styles.emptySubtitle}>
          Your team does not have any roasting equipment registered yet.
          Add devices through giesen.cloud to see them here.
        </Text>
      </View>
    );
  }, [loading]);

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
              <Text style={styles.headerTitle}>Equipment</Text>
              <Text style={styles.headerSubtitle}>
                {devices.length > 0
                  ? `${devices.length} device${devices.length !== 1 ? "s" : ""}`
                  : "Manage your roasters"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchDevices();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            devices.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textSecondary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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

  /* -- List -- */
  listContent: {
    padding: 16,
    gap: 12,
  },

  /* -- Device card -- */
  deviceCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  deviceHeader: {
    marginBottom: 12,
  },
  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  deviceName: {
    fontFamily: "DMSans-Bold",
    fontSize: 17,
    color: Colors.text,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceModelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  deviceModel: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tierBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierBadgeSpeciality: {
    backgroundColor: Colors.sunBg,
  },
  tierBadgeIndustrial: {
    backgroundColor: Colors.grapeBg,
  },
  tierBadgeBasic: {
    backgroundColor: Colors.gravelLight,
  },
  tierBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierBadgeTextSpeciality: {
    color: Colors.sun,
  },
  tierBadgeTextIndustrial: {
    color: Colors.grape,
  },
  tierBadgeTextBasic: {
    color: Colors.textTertiary,
  },
  deviceDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  deviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  roastBadge: {
    marginLeft: "auto",
    backgroundColor: Colors.skyBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roastBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.sky,
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
