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
import { InventoryItem, ApiResponse } from "@/types/index";

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

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItem() {
      try {
        const response = await apiClient.get<ApiResponse<InventoryItem>>(
          `/inventory/${id}`
        );
        setItem(response.data.data);
      } catch (err) {
        console.error("Failed to fetch inventory item:", err);
        setError("Failed to load inventory item.");
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
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
          <View style={styles.heroWeight}>
            <Text style={styles.heroWeightValue}>
              {quantityKg.toFixed(1)}
            </Text>
            <Text style={styles.heroWeightUnit}>kg</Text>
          </View>
          <Text style={styles.heroWeightLabel}>Current Stock</Text>

          {/* Threshold indicator */}
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdLabel}>Low stock threshold</Text>
            <Text style={styles.thresholdValue}>
              {thresholdKg.toFixed(1)} kg
            </Text>
          </View>
        </View>

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
        </View>

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
});
