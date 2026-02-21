import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { ProfilerProfile, ProfileSummary } from "@/types";

interface Roast {
  id: string;
  profile_name: string;
  device_name: string;
  bean_type: string | null;
  start_weight: number | null;
  end_weight: number | null;
  weight_change: number | null;
  duration: number;
  roasted_at: string;
  is_favorite: boolean;
  comment: string | null;
  cupping_score: number | null;
}

interface RoastSummary {
  today_count: number;
  total_count: number;
  this_week_count: number;
  avg_cupping_score: number | null;
}

type Segment = "roasts" | "profiles";

const FILTER_OPTIONS = ["All", "Today", "This Week", "This Month"] as const;

type FilterOption = (typeof FILTER_OPTIONS)[number];

const FILTER_PARAM_MAP: Record<FilterOption, string | undefined> = {
  All: undefined,
  Today: "today",
  "This Week": "this_week",
  "This Month": "this_month",
};

const PROFILE_FILTER_OPTIONS = ["All", "Favorites"] as const;
type ProfileFilterOption = (typeof PROFILE_FILTER_OPTIONS)[number];

const PROFILE_FILTER_PARAM_MAP: Record<ProfileFilterOption, string | undefined> = {
  All: undefined,
  Favorites: "favorites",
};

interface ScoreTier {
  color: string;
  bg: string;
  stripBg: string;
}

function getScoreTier(score: number | null): ScoreTier {
  if (score === null) {
    return { color: Colors.textTertiary, bg: Colors.gravelLight, stripBg: Colors.gravelLight };
  }
  if (score >= 90) {
    return { color: Colors.leaf, bg: Colors.leafBg, stripBg: Colors.leafBg };
  }
  if (score >= 85) {
    return { color: Colors.sky, bg: Colors.skyBg, stripBg: Colors.skyBg };
  }
  if (score >= 80) {
    return { color: Colors.sun, bg: Colors.sunBg, stripBg: Colors.sunBg };
  }
  return { color: Colors.boven, bg: Colors.bovenBg, stripBg: Colors.bovenBg };
}

function formatRoastTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (diffDays === 0) {
    return `Today, ${hours}:${minutes}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${hours}:${minutes}`;
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[date.getDay()]}, ${hours}:${minutes}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface MiniCurveProps {
  color: string;
}

function MiniCurve({ color }: MiniCurveProps) {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Path
        d="M4 30 C8 28 12 24 16 18 C20 12 24 7 32 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M4 30 C8 28 12 24 16 18 C20 12 24 7 32 6"
        stroke={color}
        strokeWidth={0.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.2}
        strokeDasharray="2 2"
      />
    </Svg>
  );
}

interface StatsRowProps {
  summary: RoastSummary | null;
}

function StatsRow({ summary }: StatsRowProps) {
  const avgScore = summary?.avg_cupping_score;
  const scoreColor = avgScore !== null && avgScore !== undefined
    ? (avgScore >= 90 ? Colors.leaf : avgScore >= 85 ? Colors.sky : avgScore >= 80 ? Colors.sun : Colors.boven)
    : Colors.sun;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={[styles.statStripe, { backgroundColor: Colors.sky }]} />
        <Text style={[styles.statValue, { color: Colors.sky }]}>
          {summary?.this_week_count ?? "-"}
        </Text>
        <Text style={styles.statLabel}>THIS WEEK</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statStripe, { backgroundColor: Colors.leaf }]} />
        <Text style={[styles.statValue, { color: Colors.leaf }]}>
          {summary?.total_count ?? "-"}
        </Text>
        <Text style={styles.statLabel}>TOTAL ROASTS</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statStripe, { backgroundColor: scoreColor }]} />
        <Text style={[styles.statValue, { color: scoreColor }]}>
          {avgScore !== null && avgScore !== undefined ? avgScore.toFixed(1) : "-"}
        </Text>
        <Text style={styles.statLabel}>AVG CUPPING</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Stats Row                                                   */
/* ------------------------------------------------------------------ */

interface ProfileStatsRowProps {
  summary: ProfileSummary | null;
}

function ProfileStatsRow({ summary }: ProfileStatsRowProps) {
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
              {formatDuration(profile.duration ?? 0)}
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
              {profile.start_weight !== null ? (profile.start_weight / 1000).toFixed(1) : "-"}
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

interface RoastCardProps {
  roast: Roast;
}

function RoastCard({ roast }: RoastCardProps) {
  const score = roast.cupping_score;
  const tier = getScoreTier(score);
  const weightKg = roast.start_weight !== null ? `${(roast.start_weight / 1000).toFixed(1)} kg` : "-";

  return (
    <View style={[styles.roastCard, { borderLeftColor: tier.color }]}>
      <View style={[styles.curveStrip, { backgroundColor: tier.stripBg }]}>
        <View style={styles.curveBox}>
          <MiniCurve color={tier.color} />
        </View>
      </View>
      <View style={styles.roastBody}>
        <View style={styles.roastTop}>
          <Text style={styles.roastName} numberOfLines={1}>
            {roast.bean_type ?? roast.profile_name}
          </Text>
          <View style={[styles.scoreBadge, { backgroundColor: tier.bg }]}>
            <Text style={[styles.scoreBadgeText, { color: tier.color }]}>
              {score !== null ? score.toFixed(1) : "-"}
            </Text>
          </View>
        </View>

        <View style={styles.roastProfile}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 20V10M18 20V4M6 20v-4"
              stroke={Colors.grape}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.roastProfileText} numberOfLines={1}>
            {roast.profile_name}
          </Text>
        </View>

        <View style={styles.roastMeta}>
          <View style={styles.roastMetaItem}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M2 6h20v12H2zM12 6V2M6 6V4M18 6V4"
                stroke={Colors.textTertiary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.roastMetaText}>
              <Text style={styles.roastMetaBold}>{roast.device_name}</Text>
              {" \u00B7 "}{weightKg}
            </Text>
          </View>
          <View style={styles.roastMetaItem}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"
                stroke={Colors.textTertiary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.roastMetaText}>
              {formatRoastTime(roast.roasted_at)}
            </Text>
          </View>
        </View>

        <View style={styles.roastDataRow}>
          <View style={styles.roastDataItem}>
            <Text style={styles.roastDataLabel}>WEIGHT</Text>
            <Text style={styles.roastDataValue}>
              {roast.start_weight !== null ? (roast.start_weight / 1000).toFixed(1) : "-"}
              <Text style={styles.roastDataUnit}>{roast.start_weight !== null ? " kg" : ""}</Text>
            </Text>
          </View>
          <View style={styles.roastDataItem}>
            <Text style={styles.roastDataLabel}>DURATION</Text>
            <Text style={styles.roastDataValue}>
              {formatDuration(roast.duration)}
            </Text>
          </View>
          <View style={styles.roastDataItemRor}>
            <Text style={styles.roastDataLabel}>LOSS</Text>
            <Text style={styles.roastDataValueRor}>
              {roast.weight_change !== null ? Math.abs(roast.weight_change).toFixed(1) : "-"}
              <Text style={styles.roastDataUnitRor}>{roast.weight_change !== null ? "%" : ""}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Profiles Modal                                                      */
/* ------------------------------------------------------------------ */

interface ProfilesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectProfile?: (profile: ProfilerProfile) => void;
}

function ProfilesModal({ visible, onClose, onSelectProfile }: ProfilesModalProps) {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<ProfilerProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfilerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      apiClient
        .get("/profiles", { params: { per_page: 100 } })
        .then((res) => {
          setProfiles(res.data.data);
          setFilteredProfiles(res.data.data);
        })
        .catch(() => {
          setProfiles([]);
          setFilteredProfiles([]);
        })
        .finally(() => setLoading(false));
    }
  }, [visible]);

  useEffect(() => {
    if (search.trim().length === 0) {
      setFilteredProfiles(profiles);
    } else {
      const q = search.toLowerCase();
      setFilteredProfiles(
        profiles.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.roaster_model && p.roaster_model.toLowerCase().includes(q))
        )
      );
    }
  }, [search, profiles]);

  function formatDurationMins(seconds: number | null): string {
    if (seconds === null) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[modalStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>Profiles</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={modalStyles.closeBtn}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6l12 12"
                stroke={Colors.text}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={modalStyles.searchContainer}>
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
            style={modalStyles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search profiles..."
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Profile list */}
        {loading ? (
          <View style={modalStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.slate} />
          </View>
        ) : (
          <FlatList
            data={filteredProfiles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={modalStyles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.profileCard}
                activeOpacity={0.7}
                onPress={() => {
                  if (onSelectProfile) {
                    onSelectProfile(item);
                  }
                }}
              >
                <View style={modalStyles.profileIconBox}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 20V10M18 20V4M6 20v-4"
                      stroke={Colors.grape}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <View style={modalStyles.profileInfo}>
                  <View style={modalStyles.profileTopRow}>
                    <Text style={modalStyles.profileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.is_favorite ? (
                      <Text style={modalStyles.favStar}>{"\u2605"}</Text>
                    ) : null}
                  </View>
                  <View style={modalStyles.profileMeta}>
                    {item.roaster_model ? (
                      <Text style={modalStyles.profileMetaText}>
                        {item.roaster_model}
                      </Text>
                    ) : null}
                    {item.duration !== null ? (
                      <Text style={modalStyles.profileMetaText}>
                        {formatDurationMins(item.duration)}
                      </Text>
                    ) : null}
                    <Text style={modalStyles.profileMetaText}>
                      {item.roasts_count} roast{item.roasts_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18l6-6-6-6"
                    stroke={Colors.textTertiary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={modalStyles.emptyState}>
                <Text style={modalStyles.emptyText}>No profiles found.</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  profileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.grapeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  favStar: {
    fontSize: 14,
    color: Colors.sun,
  },
  profileMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },
});

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function RoastsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ segment?: string }>();

  // Segment state
  const [activeSegment, setActiveSegment] = useState<Segment>(
    params.segment === "profiles" ? "profiles" : "roasts"
  );

  // Sync segment when navigating back with param
  useEffect(() => {
    if (params.segment === "profiles") {
      setActiveSegment("profiles");
    }
  }, [params.segment]);

  // Roasts state
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [summary, setSummary] = useState<RoastSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Score filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);

  // Profile filter state (for filtering roasts by profile)
  const [profileFilter, setProfileFilter] = useState<string | null>(null);

  // Profiles segment state
  const [profilesActiveFilter, setProfilesActiveFilter] = useState<ProfileFilterOption>("All");
  const [profiles, setProfiles] = useState<ProfilerProfile[]>([]);
  const [profilesSummary, setProfilesSummary] = useState<ProfileSummary | null>(null);
  const [isProfilesLoading, setIsProfilesLoading] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [profilesSearchQuery, setProfilesSearchQuery] = useState("");
  const [showProfilesSearch, setShowProfilesSearch] = useState(false);

  const fetchRoasts = useCallback(async (filter?: FilterOption) => {
    try {
      const params: Record<string, string | number> = { per_page: 20 };
      const filterParam = FILTER_PARAM_MAP[filter ?? "All"];
      if (filterParam) {
        params.filter = filterParam;
      }
      const response = await apiClient.get("/roasts", { params });
      setRoasts(response.data.data);
    } catch (error) {
      console.error("Failed to fetch roasts:", error);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await apiClient.get("/roasts/summary");
      setSummary(response.data.data);
    } catch (error) {
      console.error("Failed to fetch roast summary:", error);
    }
  }, []);

  const loadData = useCallback(
    async (filter?: FilterOption) => {
      await Promise.all([fetchRoasts(filter), fetchSummary()]);
    },
    [fetchRoasts, fetchSummary]
  );

  // Profiles fetch functions
  const fetchProfiles = useCallback(async (filter?: ProfileFilterOption) => {
    try {
      const params: Record<string, string | number> = { per_page: 50 };
      const filterParam = PROFILE_FILTER_PARAM_MAP[filter ?? "All"];
      if (filterParam) {
        params.filter = filterParam;
      }
      const response = await apiClient.get("/profiles", { params });
      setProfiles(response.data.data);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  }, []);

  const fetchProfilesSummary = useCallback(async () => {
    try {
      const response = await apiClient.get("/profiles/summary");
      setProfilesSummary(response.data.data);
    } catch (error) {
      console.error("Failed to fetch profiles summary:", error);
    }
  }, []);

  const loadProfilesData = useCallback(
    async (filter?: ProfileFilterOption) => {
      await Promise.all([fetchProfiles(filter), fetchProfilesSummary()]);
    },
    [fetchProfiles, fetchProfilesSummary]
  );

  useEffect(() => {
    setIsLoading(true);
    loadData(activeFilter).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchRoasts(activeFilter);
  }, [activeFilter, fetchRoasts]);

  // Lazy-load profiles when segment first switches
  useEffect(() => {
    if (activeSegment === "profiles" && !profilesLoaded) {
      setIsProfilesLoading(true);
      loadProfilesData(profilesActiveFilter).finally(() => {
        setIsProfilesLoading(false);
        setProfilesLoaded(true);
      });
    }
  }, [activeSegment, profilesLoaded, loadProfilesData, profilesActiveFilter]);

  // Refetch profiles when profile filter changes
  useEffect(() => {
    if (profilesLoaded) {
      fetchProfiles(profilesActiveFilter);
    }
  }, [profilesActiveFilter, fetchProfiles, profilesLoaded]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (activeSegment === "roasts") {
      await loadData(activeFilter);
    } else {
      await loadProfilesData(profilesActiveFilter);
    }
    setIsRefreshing(false);
  }, [activeSegment, activeFilter, loadData, profilesActiveFilter, loadProfilesData]);

  // Compute displayed roasts with all client-side filters applied
  const displayedRoasts = roasts.filter((r) => {
    // Search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        r.profile_name.toLowerCase().includes(q) ||
        (r.bean_type && r.bean_type.toLowerCase().includes(q)) ||
        r.device_name.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    // Score filter
    if (scoreFilter !== null) {
      if (r.cupping_score === null || r.cupping_score < scoreFilter) return false;
    }
    // Profile filter
    if (profileFilter !== null) {
      if (r.profile_name !== profileFilter) return false;
    }
    return true;
  });

  // Client-side search filtering for profiles
  const displayedProfiles = profiles.filter((p) => {
    if (profilesSearchQuery.trim().length > 0) {
      const q = profilesSearchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.roaster_model && p.roaster_model.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    return true;
  });

  const handleSegmentSwitch = (segment: Segment) => {
    setActiveSegment(segment);
    // Close any open search/filter panels when switching
    setShowSearch(false);
    setSearchQuery("");
    setShowProfilesSearch(false);
    setProfilesSearchQuery("");
    setShowFilterModal(false);
  };

  const handleSelectProfile = (profile: ProfilerProfile) => {
    setProfileFilter(profile.name);
    setShowProfiles(false);
  };

  const handleClearProfileFilter = () => {
    setProfileFilter(null);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBox}>
                <GiesenLogo size={18} color={Colors.text} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Roasts</Text>
                <Text style={styles.headerSubtitle}>Roast History</Text>
              </View>
            </View>
          </View>
          <View style={styles.segmentControl}>
            <View style={[styles.segmentButton, styles.segmentButtonActive]}>
              <Text style={[styles.segmentButtonText, styles.segmentButtonTextActive]}>Roasts</Text>
            </View>
            <View style={styles.segmentButton}>
              <Text style={styles.segmentButtonText}>Profiles</Text>
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
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {activeSegment === "roasts" ? "Roasts" : "Profiles"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {activeSegment === "roasts" ? "Roast History" : "Profile Library"}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, (activeSegment === "roasts" ? showSearch : showProfilesSearch) && styles.headerBtnActive]}
              activeOpacity={0.7}
              onPress={() => {
                if (activeSegment === "roasts") {
                  setShowSearch((v) => !v);
                  if (showSearch) setSearchQuery("");
                } else {
                  setShowProfilesSearch((v) => !v);
                  if (showProfilesSearch) setProfilesSearchQuery("");
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
            {activeSegment === "roasts" ? (
              <TouchableOpacity
                style={[styles.headerBtn, showFilterModal && styles.headerBtnActive]}
                activeOpacity={0.7}
                onPress={() => setShowFilterModal((v) => !v)}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {/* Segmented Control */}
        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[styles.segmentButton, activeSegment === "roasts" && styles.segmentButtonActive]}
            activeOpacity={0.7}
            onPress={() => handleSegmentSwitch("roasts")}
          >
            <Text style={[styles.segmentButtonText, activeSegment === "roasts" && styles.segmentButtonTextActive]}>
              Roasts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeSegment === "profiles" && styles.segmentButtonActive]}
            activeOpacity={0.7}
            onPress={() => handleSegmentSwitch("profiles")}
          >
            <Text style={[styles.segmentButtonText, activeSegment === "profiles" && styles.segmentButtonTextActive]}>
              Profiles
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---- ROASTS SEGMENT ---- */}
      {activeSegment === "roasts" ? (
        <>
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
                placeholder="Search by profile, bean, or device..."
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

          {/* Score Filter Section */}
          {showFilterModal ? (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>MIN CUPPING SCORE</Text>
              <View style={styles.filterOptions}>
                {([null, 80, 85, 90] as const).map((val) => {
                  const isActive = scoreFilter === val;
                  return (
                    <TouchableOpacity
                      key={val === null ? "all" : val}
                      style={[styles.filterOptionChip, isActive && styles.filterOptionChipActive]}
                      activeOpacity={0.7}
                      onPress={() => setScoreFilter(val)}
                    >
                      <Text style={[styles.filterOptionText, isActive && styles.filterOptionTextActive]}>
                        {val === null ? "All" : `>= ${val}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Profile Filter Banner */}
          {profileFilter !== null ? (
            <View style={styles.profileFilterBanner}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 20V10M18 20V4M6 20v-4"
                  stroke={Colors.grape}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.profileFilterText} numberOfLines={1}>
                Filtered by: {profileFilter}
              </Text>
              <TouchableOpacity onPress={handleClearProfileFilter} activeOpacity={0.7} style={styles.profileFilterClear}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6l12 12"
                    stroke={Colors.textTertiary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>Roast History</Text>
            <Text style={styles.sectionCount}>
              {displayedRoasts.length}{displayedRoasts.length !== roasts.length ? ` of ${roasts.length}` : ""} roasts
            </Text>
          </View>

          <FlatList
            data={displayedRoasts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/roasts/${item.id}`)}
              >
                <RoastCard roast={item} />
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
                <Text style={styles.emptyText}>No roasts found.</Text>
              </View>
            }
          />
        </>
      ) : null}

      {/* ---- PROFILES SEGMENT ---- */}
      {activeSegment === "profiles" ? (
        <>
          {/* Search Bar */}
          {showProfilesSearch ? (
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
                value={profilesSearchQuery}
                onChangeText={setProfilesSearchQuery}
                placeholder="Search by name or roaster..."
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {profilesSearchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setProfilesSearchQuery("")} activeOpacity={0.7}>
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

          {isProfilesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.slate} />
            </View>
          ) : (
            <>
              <ProfileStatsRow summary={profilesSummary} />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}
                style={styles.filterChipsScroll}
              >
                {PROFILE_FILTER_OPTIONS.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      profilesActiveFilter === filter && styles.filterChipActive,
                    ]}
                    onPress={() => setProfilesActiveFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        profilesActiveFilter === filter && styles.filterChipTextActive,
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
                  {displayedProfiles.length !== profiles.length ? ` of ${profiles.length}` : ""} profiles
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
            </>
          )}
        </>
      ) : null}

      <ProfilesModal
        visible={showProfiles}
        onClose={() => setShowProfiles(false)}
        onSelectProfile={handleSelectProfile}
      />
    </View>
  );
}

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

  // Segmented Control
  segmentControl: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: Colors.headerOverlay,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  segmentButtonActive: {
    backgroundColor: Colors.safety,
  },
  segmentButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: "#ffffff",
  },
  segmentButtonTextActive: {
    color: Colors.slate,
  },

  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
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

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },

  // Roast Card
  roastCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    overflow: "hidden",
    flexDirection: "row",
  },

  // Curve Strip
  curveStrip: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  curveBox: {
    width: 40,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // Card Body
  roastBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  roastTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  roastName: {
    fontFamily: "DMSans-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  scoreBadgeText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    fontWeight: "600",
  },

  // Profile
  roastProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roastProfileText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Meta Row
  roastMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  roastMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roastMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roastMetaBold: {
    fontFamily: "DMSans-Bold",
    fontWeight: "600",
    color: Colors.text,
  },

  // Data Row
  roastDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  roastDataItem: {
    gap: 1,
  },
  roastDataItemRor: {
    gap: 1,
  },
  roastDataLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    fontWeight: "500",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roastDataValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
  },
  roastDataUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  roastDataValueRor: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    fontWeight: "600",
    color: Colors.boven,
    lineHeight: 16,
  },
  roastDataUnitRor: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    fontWeight: "400",
    color: Colors.boven,
  },

  // Header button active state
  headerBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
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

  // Filter Section
  filterSection: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  filterSectionTitle: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
  },
  filterOptionChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionChipActive: {
    backgroundColor: Colors.slate,
  },
  filterOptionText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: "#ffffff",
  },

  // Profile Filter Banner
  profileFilterBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.grapeBg,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  profileFilterText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.grape,
    flex: 1,
  },
  profileFilterClear: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(126, 101, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },
});
