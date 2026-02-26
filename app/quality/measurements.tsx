import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { MeasurementCardFromApi } from "@/components/difluid/MeasurementCard";
import { LinkPickerModal } from "@/components/difluid/LinkPickerModal";
import { getAllMeasurements } from "@/api/difluid";
import { linkMeasurement } from "@/api/difluid";
import type { DiFluidMeasurementFromApi } from "@/types/index";

type FilterType = "all" | "linked" | "unlinked";

export default function MeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const [measurements, setMeasurements] = useState<DiFluidMeasurementFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkingMeasurementId, setLinkingMeasurementId] = useState<number | null>(null);

  const fetchMeasurements = useCallback(async () => {
    try {
      const data = await getAllMeasurements();
      setMeasurements(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMeasurements();
  }, [fetchMeasurements]);

  const filtered = measurements.filter((m) => {
    if (filter === "linked") return m.measurable_type_short !== null;
    if (filter === "unlinked") return m.measurable_type_short === null;
    return true;
  });

  const totalCount = measurements.length;
  const linkedCount = measurements.filter((m) => m.measurable_type_short !== null).length;
  const unlinkedCount = totalCount - linkedCount;

  function handleLinkPress(measurementId: number) {
    setLinkingMeasurementId(measurementId);
    setLinkModalVisible(true);
  }

  async function handleLinkSelect(selection: {
    type: "inventory" | "roast";
    id: number;
    name: string;
  }) {
    if (!linkingMeasurementId) return;

    try {
      await linkMeasurement(linkingMeasurementId, selection.type, selection.id);
      setLinkModalVisible(false);
      setLinkingMeasurementId(null);
      fetchMeasurements();
    } catch {
      Alert.alert("Error", "Failed to link measurement. Please try again.");
    }
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
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
              <Text style={styles.headerTitle}>Measurements</Text>
              <Text style={styles.headerSubtitle}>DiFluid</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.safety} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.safety} />
          }
        >
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryLinked]}>
              <Text style={[styles.summaryValue, { color: Colors.leaf }]}>{linkedCount}</Text>
              <Text style={styles.summaryLabel}>Linked</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryUnlinked]}>
              <Text style={[styles.summaryValue, { color: Colors.sun }]}>{unlinkedCount}</Text>
              <Text style={styles.summaryLabel}>Unlinked</Text>
            </View>
          </View>

          {/* Filter chips */}
          <View style={styles.filterRow}>
            {(["all", "linked", "unlinked"] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                activeOpacity={0.7}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Measurements list */}
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={Colors.textTertiary} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
              </Svg>
              <Text style={styles.emptyText}>No measurements found</Text>
              <Text style={styles.emptySubtext}>
                {filter === "unlinked"
                  ? "All measurements are linked"
                  : filter === "linked"
                    ? "No linked measurements yet"
                    : "Start measuring with your DiFluid device"}
              </Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {filtered.map((m) => (
                <View key={m.id}>
                  <MeasurementCardFromApi
                    measurement={m}
                    onLinkPress={
                      m.measurable_type_short === null
                        ? () => handleLinkPress(m.id)
                        : undefined
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Link Picker Modal */}
      <LinkPickerModal
        visible={linkModalVisible}
        onClose={() => {
          setLinkModalVisible(false);
          setLinkingMeasurementId(null);
        }}
        onSelect={handleLinkSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },

  /* Header */
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

  /* Content */
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Summary */
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryLinked: {
    borderColor: Colors.leafBg,
  },
  summaryUnlinked: {
    borderColor: Colors.sunBg,
  },
  summaryValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    color: Colors.text,
  },
  summaryLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Filter */
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  filterChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.safety,
  },

  /* Empty */
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
  },

  /* List */
  listGap: {
    gap: 12,
  },
});
