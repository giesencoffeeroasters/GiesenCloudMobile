import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { ProfilerProfile, ProfileSummary } from "@/types";

/* ------------------------------------------------------------------ */
/*  Filter Options                                                      */
/* ------------------------------------------------------------------ */

const FILTER_OPTIONS = ["All", "Favorites"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

const FILTER_PARAM_MAP: Record<FilterOption, string | undefined> = {
  All: undefined,
  Favorites: "favorites",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Stats Row                                                           */
/* ------------------------------------------------------------------ */

interface StatsRowProps {
  summary: ProfileSummary | null;
}

function StatsRow({ summary }: StatsRowProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={[styles.statStripe, { backgroundColor: Colors.grape }]} />
        <Text style={[styles.statValue, { color: Colors.grape }]}>
          {summary?.total_count ?? "-"}
        </Text>
        <Text style={styles.statLabel}>TOTAL PROFILES</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statStripe, { backgroundColor: Colors.sun }]} />
        <Text style={[styles.statValue, { color: Colors.sun }]}>
          {summary?.favorites_count ?? "-"}
        </Text>
        <Text style={styles.statLabel}>FAVORITES</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statStripe, { backgroundColor: Colors.sky }]} />
        <Text style={[styles.statValue, { color: Colors.sky }]}>
          {summary?.avg_duration !== null && summary?.avg_duration !== undefined
            ? formatDuration(summary.avg_duration)
            : "-"}
        </Text>
        <Text style={styles.statLabel}>AVG DURATION</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Card                                                        */
/* ------------------------------------------------------------------ */

interface ProfileCardProps {
  profile: ProfilerProfile;
}

function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileIconBox}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 20V10M18 20V4M6 20v-4"
            stroke={Colors.grape}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View style={styles.profileBody}>
        <View style={styles.profileTop}>
          <Text style={styles.profileName} numberOfLines={1}>
            {profile.name}
          </Text>
          {profile.is_favorite ? (
            <Text style={styles.favStar}>{"\u2605"}</Text>
          ) : null}
        </View>

        <View style={styles.profileMeta}>
          {profile.roaster_model ? (
            <View style={styles.profileMetaItem}>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M2 6h20v12H2zM12 6V2M6 6V4M18 6V4"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.profileMetaText}>{profile.roaster_model}</Text>
            </View>
          ) : null}
          <View style={styles.profileMetaItem}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"
                stroke={Colors.textTertiary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.profileMetaText}>
              {formatDuration(profile.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.profileDataRow}>
          <View style={styles.profileDataItem}>
            <Text style={styles.profileDataLabel}>ROASTS</Text>
            <Text style={styles.profileDataValue}>
              {profile.roasts_count}
            </Text>
          </View>
          <View style={styles.profileDataItem}>
            <Text style={styles.profileDataLabel}>WEIGHT</Text>
            <Text style={styles.profileDataValue}>
              {profile.start_weight !== null ? profile.start_weight.toFixed(1) : "-"}
              <Text style={styles.profileDataUnit}>
                {profile.start_weight !== null ? " kg" : ""}
              </Text>
            </Text>
          </View>
          {profile.weight_change !== null ? (
            <View style={styles.profileDataItem}>
              <Text style={styles.profileDataLabel}>LOSS</Text>
              <Text style={styles.profileDataValueLoss}>
                {Math.abs(profile.weight_change).toFixed(1)}
                <Text style={styles.profileDataUnitLoss}>%</Text>
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [profiles, setProfiles] = useState<ProfilerProfile[]>([]);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProfiles = useCallback(async (filter?: FilterOption) => {
    try {
      const params: Record<string, string | number> = { per_page: 50 };
      const filterParam = FILTER_PARAM_MAP[filter ?? "All"];
      if (filterParam) {
        params.filter = filterParam;
      }
      const response = await apiClient.get("/profiles", { params });
      setProfiles(response.data.data);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await apiClient.get("/profiles/summary");
      setSummary(response.data.data);
    } catch (error) {
      console.error("Failed to fetch profile summary:", error);
    }
  }, []);

  const loadData = useCallback(
    async (filter?: FilterOption) => {
      await Promise.all([fetchProfiles(filter), fetchSummary()]);
    },
    [fetchProfiles, fetchSummary]
  );

  useEffect(() => {
    setIsLoading(true);
    loadData(activeFilter).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchProfiles(activeFilter);
  }, [activeFilter, fetchProfiles]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(activeFilter);
    setIsRefreshing(false);
  }, [activeFilter, loadData]);

  // Client-side search filtering
  const displayedProfiles = profiles.filter((p) => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.roaster_model && p.roaster_model.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() => router.back()}
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
                <Text style={styles.headerTitle}>Profiles</Text>
                <Text style={styles.headerSubtitle}>Profile Library</Text>
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
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
              <Text style={styles.headerTitle}>Profiles</Text>
              <Text style={styles.headerSubtitle}>Profile Library</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, showSearch && styles.headerBtnActive]}
              activeOpacity={0.7}
              onPress={() => {
                setShowSearch((v) => !v);
                if (showSearch) {
                  setSearchQuery("");
                }
              }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
                  stroke="#fff"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch ? (
        <View style={styles.searchBar}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
              stroke={Colors.textTertiary}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or roaster..."
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={Colors.textTertiary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <StatsRow summary={summary} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContainer}
        style={styles.filterChipsScroll}
      >
        {FILTER_OPTIONS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Profile Library</Text>
        <Text style={styles.sectionCount}>
          {displayedProfiles.length}
          {displayedProfiles.length !== profiles.length
            ? ` of ${profiles.length}`
            : ""}{" "}
          profiles
        </Text>
      </View>

      <FlatList
        data={displayedProfiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/profiles/${item.id}`)}
          >
            <ProfileCard profile={item} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.slate}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 20V10M18 20V4M6 20v-4"
                stroke={Colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.emptyText}>No profiles found.</Text>
          </View>
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    backgroundColor: Colors.slate,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    overflow: "hidden",
    position: "relative",
  },
  statStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 28,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Filter Chips
  filterChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 16,
    marginBottom: 8,
    minHeight: 52,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  filterChip: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.gravel,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },

  // Profile Card
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.grape,
    overflow: "hidden",
    flexDirection: "row",
  },
  profileIconBox: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.grapeBg,
  },
  profileBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  profileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  profileName: {
    fontFamily: "DMSans-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
    flex: 1,
  },
  favStar: {
    fontSize: 14,
    color: Colors.sun,
  },

  // Meta Row
  profileMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  profileMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  profileMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Data Row
  profileDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  profileDataItem: {
    gap: 1,
  },
  profileDataLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    fontWeight: "500",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileDataValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
  },
  profileDataUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  profileDataValueLoss: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    fontWeight: "600",
    color: Colors.boven,
    lineHeight: 16,
  },
  profileDataUnitLoss: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    fontWeight: "400",
    color: Colors.boven,
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },
});
