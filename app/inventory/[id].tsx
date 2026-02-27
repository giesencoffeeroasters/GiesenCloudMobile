import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect as SvgRect } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { InventoryItem, InventoryTransaction, ApiResponse, DiFluidMeasurementFromApi } from "@/types/index";
import { getMeasurementsForInventory } from "@/api/difluid";
import { MeasurementCardFromApi } from "@/components/difluid/MeasurementCard";
import { useDiFluidStore } from "@/stores/difluidStore";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getStockColor(status: "ok" | "low" | "critical"): string {
  switch (status) {
    case "ok":
      return Colors.leaf;
    case "low":
      return Colors.sun;
    case "critical":
      return Colors.traffic;
  }
}

function getStockLabel(status: "ok" | "low" | "critical"): string {
  switch (status) {
    case "ok":
      return "In Stock";
    case "low":
      return "Low Stock";
    case "critical":
      return "Critical";
  }
}

function getStockBadgeBg(status: "ok" | "low" | "critical"): string {
  switch (status) {
    case "ok":
      return Colors.leafBg;
    case "low":
      return Colors.sunBg;
    case "critical":
      return Colors.trafficBg;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getScaGradeColor(grade: string | null): { color: string; bg: string } {
  if (!grade) return { color: Colors.textTertiary, bg: Colors.gravelLight };
  const g = grade.toLowerCase();
  if (g === "specialty") return { color: Colors.leaf, bg: Colors.leafBg };
  if (g === "premium") return { color: Colors.sky, bg: Colors.skyBg };
  if (g === "exchange") return { color: Colors.sun, bg: Colors.sunBg };
  return { color: Colors.traffic, bg: Colors.trafficBg };
}

function getScoreColor(score: number | null): { color: string; bg: string } {
  if (score === null) return { color: Colors.textTertiary, bg: Colors.gravelLight };
  if (score >= 90) return { color: Colors.leaf, bg: Colors.leafBg };
  if (score >= 85) return { color: Colors.sky, bg: Colors.skyBg };
  if (score >= 80) return { color: Colors.sun, bg: Colors.sunBg };
  return { color: Colors.boven, bg: Colors.bovenBg };
}

function getTransactionColor(direction: string | null): { color: string; bg: string } {
  switch (direction) {
    case "in":
      return { color: Colors.leaf, bg: Colors.leafBg };
    case "out":
      return { color: Colors.traffic, bg: Colors.trafficBg };
    default:
      return { color: Colors.sun, bg: Colors.sunBg };
  }
}

function getTransactionSign(direction: string | null): string {
  switch (direction) {
    case "in":
      return "+";
    case "out":
      return "\u2212";
    default:
      return "";
  }
}

function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* ------------------------------------------------------------------ */
/*  Tab type                                                            */
/* ------------------------------------------------------------------ */

type TabKey = "details" | "quality";

/* ------------------------------------------------------------------ */
/*  Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [difluidMeasurements, setDifluidMeasurements] = useState<DiFluidMeasurementFromApi[]>([]);
  const difluidConnected = useDiFluidStore((s) => s.connectionStatus === "connected" || s.connectionStatus === "measuring");

  const fetchItem = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get<ApiResponse<InventoryItem>>(
        `/inventory/${id}`
      );
      setItem(response.data.data);
    } catch (err) {
      console.error("Failed to fetch inventory item:", err);
      setError("Failed to load inventory item.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
    getMeasurementsForInventory(Number(id))
      .then(setDifluidMeasurements)
      .catch(() => {});
  }, [fetchItem, id]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItem();
  }, [fetchItem]);

  const hasQualityData = useMemo(() => {
    if (!item) return false;
    return !!(
      item.latest_physical_reading ||
      item.latest_defect_analysis ||
      item.latest_screen_analysis ||
      (item.cupping_samples && item.cupping_samples.length > 0) ||
      difluidMeasurements.length > 0 ||
      difluidConnected
    );
  }, [item, difluidMeasurements, difluidConnected]);

  /* -- Loading State -- */
  if (loading) {
    return (
      <View style={styles.screen}>
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
                <Text style={styles.headerTitle}>Inventory</Text>
                <Text style={styles.headerSubtitle}>Item Details</Text>
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

  /* -- Error State -- */
  if (error || !item) {
    return (
      <View style={styles.screen}>
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
                <Text style={styles.headerTitle}>Inventory</Text>
                <Text style={styles.headerSubtitle}>Item Details</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error ?? "Item not found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stockColor = getStockColor(item.stock_status);
  const quantityKg = item.current_quantity_grams / 1000;
  const thresholdKg = item.low_stock_threshold_grams / 1000;

  return (
    <View style={styles.screen}>
      {/* Dark slate header */}
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
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.headerSubtitle}>
                {item.formatted_inventory_number}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* Stock status + weight hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: getStockBadgeBg(item.stock_status) },
              ]}
            >
              <View
                style={[styles.stockDot, { backgroundColor: stockColor }]}
              />
              <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                {getStockLabel(item.stock_status)}
              </Text>
            </View>
            {item.item_type ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.item_type.name}</Text>
              </View>
            ) : null}
          </View>

          {/* Origin badge */}
          {item.country_of_origin ? (
            <View style={styles.originBadge}>
              <Text style={styles.originBadgeText}>
                {item.country_of_origin}
                {item.region_of_origin ? ` \u00B7 ${item.region_of_origin}` : ""}
              </Text>
            </View>
          ) : null}

          <View style={styles.heroWeight}>
            <Text style={styles.heroWeightValue}>
              {quantityKg.toFixed(1)}
            </Text>
            <Text style={styles.heroWeightUnit}>kg</Text>
          </View>
          <Text style={styles.heroWeightLabel}>Current Stock</Text>

          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdLabel}>Low stock threshold</Text>
            <Text style={styles.thresholdValue}>
              {thresholdKg.toFixed(1)} kg
            </Text>
          </View>
        </View>

        {/* Tab Bar */}
        {hasQualityData ? (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "details" && styles.tabActive]}
              onPress={() => setActiveTab("details")}
              activeOpacity={0.7}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 20V10M18 20V4M6 20v-4"
                  stroke={activeTab === "details" ? Colors.slate : Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={[styles.tabText, activeTab === "details" && styles.tabTextActive]}>
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "quality" && styles.tabActive]}
              onPress={() => setActiveTab("quality")}
              activeOpacity={0.7}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  stroke={activeTab === "quality" ? Colors.slate : Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.tabText, activeTab === "quality" && styles.tabTextActive]}>
                Quality
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ============ DETAILS TAB ============ */}
        {activeTab === "details" ? (
          <>
            {/* Details card */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {item.location?.name ?? "N/A"}
                </Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier</Text>
                <Text style={styles.detailValue}>
                  {item.supplier?.name ?? "N/A"}
                </Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Received</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.received_at)}
                </Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>
                  {item.status?.name ?? "N/A"}
                </Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.created_at)}
                </Text>
              </View>

              {item.lot_code ? (
                <>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Lot Code</Text>
                    <Text style={styles.detailValue}>{item.lot_code}</Text>
                  </View>
                </>
              ) : null}

              {item.sku ? (
                <>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SKU</Text>
                    <Text style={styles.detailValue}>{item.sku}</Text>
                  </View>
                </>
              ) : null}

              {item.production_year ? (
                <>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Production Year</Text>
                    <Text style={styles.detailValue}>{item.production_year}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Origin Card */}
            {item.country_of_origin || item.region_of_origin || item.size_grade ? (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Origin</Text>

                {item.country_of_origin ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Country</Text>
                    <Text style={styles.detailValue}>{item.country_of_origin}</Text>
                  </View>
                ) : null}

                {item.region_of_origin ? (
                  <>
                    {item.country_of_origin ? <View style={styles.detailDivider} /> : null}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Region</Text>
                      <Text style={styles.detailValue}>{item.region_of_origin}</Text>
                    </View>
                  </>
                ) : null}

                {item.production_year ? (
                  <>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Production Year</Text>
                      <Text style={styles.detailValue}>{item.production_year}</Text>
                    </View>
                  </>
                ) : null}

                {item.size_grade ? (
                  <>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Size Grade</Text>
                      <Text style={styles.detailValue}>{item.size_grade}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            {/* Pricing Card */}
            {item.price_per_kg ? (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Pricing</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price per kg</Text>
                  <Text style={styles.detailValue}>
                    {item.currency ?? ""} {Number(item.price_per_kg).toFixed(2)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Processing Methods */}
            {item.processing_methods && item.processing_methods.length > 0 ? (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Processing Methods</Text>
                <View style={styles.tagRow}>
                  {item.processing_methods.map((m) => (
                    <View key={m.id} style={[styles.tag, styles.processingTag]}>
                      <Text style={[styles.tagText, styles.processingTagText]}>
                        {m.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Varieties */}
            {item.varieties && item.varieties.length > 0 ? (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Varieties</Text>
                <View style={styles.tagRow}>
                  {item.varieties.map((v) => (
                    <View key={v.id} style={styles.tag}>
                      <Text style={styles.tagText}>{v.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Certificates */}
            {item.certificates && item.certificates.length > 0 ? (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Certificates</Text>
                <View style={styles.tagRow}>
                  {item.certificates.map((c) => (
                    <View key={c.id} style={[styles.tag, styles.certTag]}>
                      <Text style={[styles.tagText, styles.certTagText]}>
                        {c.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Assigned Profiles */}
            {item.assigned_profiles && item.assigned_profiles.length > 0 ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M22 12h-4l-3 9L9 3l-3 9H2"
                      stroke={Colors.grape}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Assigned Profiles</Text>
                  <Text style={styles.cardCount}>{item.assigned_profiles.length}</Text>
                </View>
                {item.assigned_profiles.map((profile, index) => (
                  <TouchableOpacity
                    key={profile.id}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/profiles/${profile.id}`)}
                  >
                    <View style={styles.listItemRow}>
                      <View style={styles.listItemLeft}>
                        <Text style={styles.listItemName} numberOfLines={1}>
                          {profile.name}
                        </Text>
                        <Text style={styles.listItemMeta}>
                          {profile.roaster_model ?? "Profile"}
                          {profile.duration ? ` \u00B7 ${formatDuration(profile.duration)}` : ""}
                        </Text>
                      </View>
                      <View style={styles.listItemRight}>
                        {profile.is_main ? (
                          <View style={styles.mainBadge}>
                            <Text style={styles.mainBadgeText}>Main</Text>
                          </View>
                        ) : null}
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M9 18l6-6-6-6"
                            stroke={Colors.textTertiary}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </View>
                    </View>
                    {index < item.assigned_profiles!.length - 1 ? (
                      <View style={styles.listDivider} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Notes */}
            {item.notes ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      stroke={Colors.textSecondary}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Notes</Text>
                </View>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}

            {/* Recent Transactions */}
            {item.recent_transactions && item.recent_transactions.length > 0 ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z"
                      stroke={Colors.sky}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Recent Transactions</Text>
                  <Text style={styles.cardCount}>{item.recent_transactions.length}</Text>
                </View>
                {item.recent_transactions.map((tx, index) => {
                  const txColor = getTransactionColor(tx.direction);
                  const txSign = getTransactionSign(tx.direction);
                  const txKg = tx.quantity / 1000;
                  return (
                    <View key={tx.id}>
                      <View style={styles.txRow}>
                        <View style={styles.txLeft}>
                          <View style={styles.txLabelRow}>
                            <View style={[styles.txDirectionDot, { backgroundColor: txColor.color }]} />
                            <Text style={styles.txTypeLabel}>{tx.type_label}</Text>
                          </View>
                          <Text style={styles.txMeta}>
                            {formatTransactionDate(tx.created_at)}
                            {tx.created_by ? ` \u00B7 ${tx.created_by}` : ""}
                          </Text>
                          {tx.remarks ? (
                            <Text style={styles.txRemarks} numberOfLines={1}>
                              {tx.remarks}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.txRight}>
                          <Text style={[styles.txQuantity, { color: txColor.color }]}>
                            {txSign}{txKg.toFixed(1)} kg
                          </Text>
                          <Text style={styles.txBalance}>
                            {(tx.new_quantity_grams / 1000).toFixed(1)} kg
                          </Text>
                        </View>
                      </View>
                      {index < item.recent_transactions!.length - 1 ? (
                        <View style={styles.listDivider} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : null}

        {/* ============ QUALITY TAB ============ */}
        {activeTab === "quality" ? (
          <>
            {/* Physical Readings Card */}
            {item.latest_physical_reading ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                      stroke={Colors.sky}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                      stroke={Colors.sky}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Green Coffee Analysis</Text>
                </View>

                {/* Main stat cards row */}
                <View style={styles.qualityStatsRow}>
                  {item.latest_physical_reading.moisture_content !== null ? (
                    <View style={styles.qualityStat}>
                      <Text style={styles.qualityStatLabel}>Moisture</Text>
                      <Text style={styles.qualityStatValue}>
                        {Number(item.latest_physical_reading.moisture_content).toFixed(1)}
                      </Text>
                      <Text style={styles.qualityStatUnit}>%</Text>
                    </View>
                  ) : null}
                  {item.latest_physical_reading.water_activity !== null ? (
                    <View style={styles.qualityStat}>
                      <Text style={styles.qualityStatLabel}>Water Activity</Text>
                      <Text style={styles.qualityStatValue}>
                        {Number(item.latest_physical_reading.water_activity).toFixed(3)}
                      </Text>
                      <Text style={styles.qualityStatUnit}>aw</Text>
                    </View>
                  ) : null}
                  {item.latest_physical_reading.density !== null ? (
                    <View style={styles.qualityStat}>
                      <Text style={styles.qualityStatLabel}>Density</Text>
                      <Text style={styles.qualityStatValue}>
                        {Math.round(Number(item.latest_physical_reading.density))}
                      </Text>
                      <Text style={styles.qualityStatUnit}>g/L</Text>
                    </View>
                  ) : null}
                </View>

                {/* Agtron */}
                {item.latest_physical_reading.agtron_number !== null ? (
                  <View style={styles.qualityStatsRow}>
                    <View style={styles.qualityStat}>
                      <Text style={styles.qualityStatLabel}>Agtron</Text>
                      <Text style={styles.qualityStatValue}>
                        {Number(item.latest_physical_reading.agtron_number).toFixed(1)}
                      </Text>
                      <Text style={styles.qualityStatUnit}>color</Text>
                    </View>
                  </View>
                ) : null}

                {/* Secondary readings */}
                {(item.latest_physical_reading.temperature !== null ||
                  item.latest_physical_reading.humidity !== null) ? (
                  <View style={styles.secondaryRow}>
                    {item.latest_physical_reading.temperature !== null ? (
                      <View style={styles.secondaryItem}>
                        <Text style={styles.secondaryLabel}>Temperature</Text>
                        <Text style={styles.secondaryValue}>
                          {Number(item.latest_physical_reading.temperature).toFixed(1)}{"\u00B0"}C
                        </Text>
                      </View>
                    ) : null}
                    {item.latest_physical_reading.humidity !== null ? (
                      <View style={styles.secondaryItem}>
                        <Text style={styles.secondaryLabel}>Humidity</Text>
                        <Text style={styles.secondaryValue}>
                          {Number(item.latest_physical_reading.humidity).toFixed(1)}%
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Measured at + source */}
                {item.latest_physical_reading.measured_at ? (
                  <View style={styles.measuredAtRow}>
                    <Text style={styles.measuredAt}>
                      Measured {formatDate(item.latest_physical_reading.measured_at)}
                    </Text>
                    {item.latest_physical_reading.source === "difluid" ? (
                      <View style={styles.sourceBadge}>
                        <Text style={styles.sourceBadgeText}>DiFluid</Text>
                      </View>
                    ) : item.latest_physical_reading.source === "manual" ? (
                      <View style={[styles.sourceBadge, styles.sourceBadgeManual]}>
                        <Text style={[styles.sourceBadgeText, styles.sourceBadgeManualText]}>Manual</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Defect Analysis Card */}
            {item.latest_defect_analysis ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                      stroke={Colors.boven}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Defect Analysis</Text>
                </View>

                {/* SCA Grade Badge */}
                {item.latest_defect_analysis.sca_grade ? (
                  <View style={styles.gradeRow}>
                    <View
                      style={[
                        styles.gradeBadge,
                        { backgroundColor: getScaGradeColor(item.latest_defect_analysis.sca_grade).bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeBadgeText,
                          { color: getScaGradeColor(item.latest_defect_analysis.sca_grade).color },
                        ]}
                      >
                        {item.latest_defect_analysis.sca_grade}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.defectStatsRow}>
                  <View style={styles.defectStat}>
                    <Text style={styles.defectStatLabel}>Cat. 1 Defects</Text>
                    <Text style={[styles.defectStatValue, { color: Colors.traffic }]}>
                      {item.latest_defect_analysis.total_category_1_defects}
                    </Text>
                  </View>
                  <View style={styles.defectStat}>
                    <Text style={styles.defectStatLabel}>Cat. 2 Defects</Text>
                    <Text style={[styles.defectStatValue, { color: Colors.boven }]}>
                      {item.latest_defect_analysis.total_category_2_defects}
                    </Text>
                  </View>
                </View>

                {item.latest_defect_analysis.sample_weight_grams ? (
                  <Text style={[styles.measuredAt, { marginTop: 8 }]}>
                    Sample weight: {(Number(item.latest_defect_analysis.sample_weight_grams) / 1000).toFixed(1)} kg
                    {item.latest_defect_analysis.analyzed_at
                      ? ` \u00B7 ${formatDate(item.latest_defect_analysis.analyzed_at)}`
                      : ""}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Screen Size Distribution Card */}
            {item.latest_screen_analysis &&
              item.latest_screen_analysis.results &&
              item.latest_screen_analysis.results.length > 0 ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 20V10M18 20V4M6 20v-4"
                      stroke={Colors.sky}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Screen Size Distribution</Text>
                </View>

                <View style={styles.screenChart}>
                  {item.latest_screen_analysis.results.map((result, i) => {
                    const maxPct = Math.max(
                      ...item.latest_screen_analysis!.results.map((r) => r.percentage)
                    );
                    const barWidth = maxPct > 0 ? (result.percentage / maxPct) * 100 : 0;
                    return (
                      <View key={i} style={styles.screenRow}>
                        <Text style={styles.screenLabel}>
                          {result.screen_size}
                        </Text>
                        <View style={styles.screenBarBg}>
                          <View
                            style={[
                              styles.screenBarFill,
                              {
                                width: `${barWidth}%`,
                                backgroundColor: Colors.sky,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.screenPct}>
                          {Number(result.percentage).toFixed(1)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {item.latest_screen_analysis.analyzed_at ? (
                  <Text style={[styles.measuredAt, { marginTop: 8 }]}>
                    Analyzed {formatDate(item.latest_screen_analysis.analyzed_at)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Cupping Sessions Card */}
            {item.cupping_samples && item.cupping_samples.length > 0 ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      stroke={Colors.sun}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>Cupping Sessions</Text>
                  <Text style={styles.cardCount}>{item.cupping_samples.length}</Text>
                </View>
                {item.cupping_samples.map((sample, index) => {
                  const scoreStyle = getScoreColor(sample.average_score);
                  return (
                    <TouchableOpacity
                      key={sample.id}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/quality/${sample.session_id}`)}
                    >
                      <View style={styles.listItemRow}>
                        <View style={styles.listItemLeft}>
                          <Text style={styles.listItemName}>
                            {sample.sample_code}
                          </Text>
                        </View>
                        <View style={styles.listItemRight}>
                          {sample.average_score !== null ? (
                            <View
                              style={[
                                styles.scoreBadge,
                                { backgroundColor: scoreStyle.bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.scoreBadgeText,
                                  { color: scoreStyle.color },
                                ]}
                              >
                                {Number(sample.average_score).toFixed(1)}
                              </Text>
                            </View>
                          ) : null}
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M9 18l6-6-6-6"
                              stroke={Colors.textTertiary}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </View>
                      </View>
                      {index < item.cupping_samples!.length - 1 ? (
                        <View style={styles.listDivider} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* DiFluid Measurements */}
            {difluidMeasurements.length > 0 ? (
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"
                      stroke={Colors.sky}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.cardTitle}>DiFluid Measurements</Text>
                  <Text style={styles.cardCount}>{difluidMeasurements.length}</Text>
                </View>
                <View style={{ gap: 10 }}>
                  {difluidMeasurements.map((m) => (
                    <MeasurementCardFromApi key={m.id} measurement={m} />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Take Measurement Button */}
            {difluidConnected ? (
              <TouchableOpacity
                style={styles.difluidButton}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/difluid/measure",
                    params: { inventoryId: id, itemName: item.name },
                  })
                }
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" />
                </Svg>
                <Text style={styles.difluidButtonText}>Take DiFluid Measurement</Text>
              </TouchableOpacity>
            ) : null}

            {/* No quality data message */}
            {!item.latest_physical_reading &&
              !item.latest_defect_analysis &&
              !item.latest_screen_analysis &&
              (!item.cupping_samples || item.cupping_samples.length === 0) &&
              difluidMeasurements.length === 0 ? (
              <View style={styles.emptyState}>
                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    stroke={Colors.textTertiary}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.emptyText}>No quality data available</Text>
                <Text style={styles.emptySubtext}>
                  Quality measurements will appear here once recorded.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

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
    paddingBottom: 40,
    gap: 16,
  },

  /* -- Hero card -- */
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
  },
  typeBadge: {
    backgroundColor: Colors.skyBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.sky,
  },
  originBadge: {
    backgroundColor: Colors.grapeBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  originBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.grape,
  },
  heroWeight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroWeightValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 40,
    color: Colors.text,
  },
  heroWeightUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  heroWeightLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  thresholdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  thresholdLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  thresholdValue: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* -- Tab Bar -- */
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 7,
  },
  tabActive: {
    backgroundColor: Colors.slate,
  },
  tabText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: "#ffffff",
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  cardCount: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
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
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },

  /* -- Tags -- */
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.gravelLight,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  certTag: {
    backgroundColor: Colors.leafBg,
  },
  certTagText: {
    color: Colors.leaf,
  },
  processingTag: {
    backgroundColor: Colors.skyBg,
  },
  processingTagText: {
    color: Colors.sky,
  },

  /* -- List items (profiles, cupping) -- */
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  listItemLeft: {
    flex: 1,
    gap: 3,
  },
  listItemName: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  listItemMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  mainBadge: {
    backgroundColor: Colors.grapeBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mainBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.grape,
  },

  /* -- Score badge -- */
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 12,
  },

  /* -- Notes -- */
  notesText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  /* -- Quality stats -- */
  qualityStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  qualityStat: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  qualityStatLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qualityStatValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 20,
    color: Colors.text,
  },
  qualityStatUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textSecondary,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  secondaryItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  secondaryLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  secondaryValue: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  measuredAtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  measuredAt: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  sourceBadge: {
    backgroundColor: Colors.skyBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.sky,
  },
  sourceBadgeManual: {
    backgroundColor: Colors.gravelLight,
  },
  sourceBadgeManualText: {
    color: Colors.textSecondary,
  },

  /* -- Defect Analysis -- */
  gradeRow: {
    marginBottom: 12,
  },
  gradeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
  },
  defectStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  defectStat: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  defectStatLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  defectStatValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
  },

  /* -- Screen size chart -- */
  screenChart: {
    gap: 6,
  },
  screenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  screenLabel: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    width: 28,
    textAlign: "right",
  },
  screenBarBg: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.bg,
    borderRadius: 4,
    overflow: "hidden",
  },
  screenBarFill: {
    height: "100%",
    borderRadius: 4,
    opacity: 0.7,
  },
  screenPct: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    width: 40,
    textAlign: "right",
  },

  /* -- Transactions -- */
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  txLeft: {
    flex: 1,
    gap: 3,
  },
  txLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  txDirectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  txTypeLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
  },
  txMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textTertiary,
    marginLeft: 15,
  },
  txRemarks: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginLeft: 15,
  },
  txRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  txQuantity: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  txBalance: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textTertiary,
  },

  /* -- DiFluid button -- */
  difluidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.sky,
    borderRadius: 8,
    paddingVertical: 14,
  },
  difluidButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },

  /* -- Empty state -- */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptySubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
  },
});
