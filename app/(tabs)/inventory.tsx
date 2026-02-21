import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import {
  InventoryItem,
  InventorySummary,
  ApiResponse,
  PaginatedResponse,
} from "@/types/index";

type FilterOption = "All" | "Green Beans" | "Roasted" | "Blends";
type ViewMode = "list" | "grid";

const FILTER_OPTIONS: FilterOption[] = [
  "All",
  "Green Beans",
  "Roasted",
  "Blends",
];

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

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total_items: 0,
    total_weight: 0,
    low_stock_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adjust weight modal state
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustWeight, setAdjustWeight] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const fetchInventory = useCallback(async (search?: string) => {
    try {
      const params: Record<string, string | number> = { per_page: 100 };
      if (search && search.trim().length > 0) {
        params.search = search.trim();
      }

      const [inventoryResponse, summaryResponse] = await Promise.all([
        apiClient.get<PaginatedResponse<InventoryItem>>("/inventory", {
          params,
        }),
        apiClient.get<ApiResponse<InventorySummary>>("/inventory/summary"),
      ]);

      setAllItems(inventoryResponse.data.data);
      setSummary(summaryResponse.data.data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setAllItems([]);
    }
  }, []);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      await fetchInventory(searchQuery);

      setLoading(false);
      setRefreshing(false);
    },
    [fetchInventory, searchQuery]
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchInventory(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, fetchInventory]);

  useEffect(() => {
    if (activeFilter === "All") {
      setItems(allItems);
    } else {
      setItems(
        allItems.filter((item) => item.item_type?.name === activeFilter)
      );
    }
  }, [activeFilter, allItems]);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const handleOpenAdjustModal = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustWeight("");
    setAdjustReason("");
    setAdjustModalVisible(true);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustItem) return;

    const weightKg = parseFloat(adjustWeight);
    if (isNaN(weightKg) || weightKg < 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight in kg.");
      return;
    }

    if (!adjustReason.trim()) {
      Alert.alert("Reason Required", "Please enter a reason for the adjustment.");
      return;
    }

    setAdjustSubmitting(true);
    try {
      await apiClient.post(`/inventory/${adjustItem.id}/adjust`, {
        quantity_grams: Math.round(weightKg * 1000),
        reason: adjustReason.trim(),
      });

      setAdjustModalVisible(false);
      setAdjustItem(null);
      await fetchInventory(searchQuery);
    } catch (error) {
      console.error("Failed to adjust weight:", error);
      Alert.alert("Error", "Failed to adjust weight. Please try again.");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleViewDetails = (item: InventoryItem) => {
    router.push(`/inventory/${item.id}`);
  };

  const totalWeight = summary.total_weight / 1000;

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const stockColor = getStockColor(item.stock_status);
    const quantityKg = item.current_quantity_grams / 1000;

    if (viewMode === "grid") {
      return (
        <View style={styles.gridCard}>
          <View
            style={[styles.gridStockIndicator, { backgroundColor: stockColor }]}
          />
          <View style={styles.gridContent}>
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: getStockBadgeBg(item.stock_status) },
              ]}
            >
              <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                {getStockLabel(item.stock_status)}
              </Text>
            </View>
            <Text style={styles.gridItemName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemSku}>
              {item.formatted_inventory_number}
            </Text>
            <Text style={styles.gridWeightValue}>
              {quantityKg.toFixed(1)}
              <Text style={styles.gridWeightUnit}> kg</Text>
            </Text>
            <View style={styles.gridActions}>
              <TouchableOpacity
                style={styles.gridActionButton}
                activeOpacity={0.6}
                onPress={() => handleOpenAdjustModal(item)}
              >
                <Text style={styles.gridActionText}>Adjust</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridActionButton}
                activeOpacity={0.6}
                onPress={() => handleViewDetails(item)}
              >
                <Text style={styles.gridActionText}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.itemCard}>
        <View
          style={[styles.stockIndicator, { backgroundColor: stockColor }]}
        />
        <View style={styles.itemContent}>
          {/* Top section: name, SKU, badge, weight */}
          <View style={styles.itemTopRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemSku}>
                {item.formatted_inventory_number}
              </Text>
            </View>
            <View style={styles.itemTopRight}>
              <View
                style={[
                  styles.stockBadge,
                  { backgroundColor: getStockBadgeBg(item.stock_status) },
                ]}
              >
                <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                  {getStockLabel(item.stock_status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Weight display */}
          <View style={styles.weightRow}>
            <Text style={styles.weightValue}>
              {quantityKg.toFixed(1)}
              <Text style={styles.weightUnit}> kg</Text>
            </Text>
          </View>

          {/* Details: Location */}
          {item.location ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{item.location.name}</Text>
            </View>
          ) : null}

          {/* Meta row: supplier + received date */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Supplier</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {item.supplier?.name ?? "N/A"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Received</Text>
              <Text style={styles.metaValue}>
                {formatDate(item.received_at)}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.6}
              onPress={() => handleOpenAdjustModal(item)}
            >
              <Text style={styles.actionButtonText}>Adjust Weight</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.6}
              onPress={() => handleViewDetails(item)}
            >
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.title}>Inventory</Text>
              <Text style={styles.headerSubtitle}>Stock Management</Text>
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
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.headerSubtitle}>Stock Management</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              viewMode === "list" && styles.headerButtonActive,
            ]}
            activeOpacity={0.6}
            onPress={() => setViewMode("list")}
          >
            <Text
              style={[
                styles.headerButtonIcon,
                viewMode === "list" && styles.headerButtonIconActive,
              ]}
            >
              {"\u2630"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerButton,
              viewMode === "grid" && styles.headerButtonActive,
            ]}
            activeOpacity={0.6}
            onPress={() => setViewMode("grid")}
          >
            <Text
              style={[
                styles.headerButtonIcon,
                viewMode === "grid" && styles.headerButtonIconActive,
              ]}
            >
              {"\u25A6"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>{"\u2315"}</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search inventory..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
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
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.sky }]}>
            {summary.total_items}
          </Text>
          <Text style={styles.summaryLabel}>TOTAL ITEMS</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.boven }]}>
            {summary.low_stock_count}
          </Text>
          <Text style={styles.summaryLabel}>LOW STOCK</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.leaf }]}>
            {totalWeight.toFixed(1)}
            <Text style={styles.summaryUnit}> kg</Text>
          </Text>
          <Text style={styles.summaryLabel}>TOTAL WEIGHT</Text>
        </View>
      </View>

      {/* Item list */}
      <FlatList
        key={viewMode}
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={viewMode === "grid" ? 2 : 1}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.slate}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No inventory items found.</Text>
          </View>
        }
      />

      {/* Adjust Weight Modal */}
      <Modal
        visible={adjustModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAdjustModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Weight</Text>
              {adjustItem ? (
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {adjustItem.name}
                </Text>
              ) : null}
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>New Weight (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={adjustWeight}
                  onChangeText={setAdjustWeight}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Reason</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputMultiline]}
                  value={adjustReason}
                  onChangeText={setAdjustReason}
                  placeholder="e.g. Physical count, spillage, received shipment..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setAdjustModalVisible(false)}
                activeOpacity={0.7}
                disabled={adjustSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  adjustSubmitting && styles.modalSubmitDisabled,
                ]}
                onPress={handleAdjustSubmit}
                activeOpacity={0.7}
                disabled={adjustSubmitting}
              >
                {adjustSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  title: {
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
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonActive: {
    backgroundColor: Colors.safety,
  },
  headerButtonIcon: {
    fontSize: 18,
    color: "#ffffff",
    opacity: 0.9,
  },
  headerButtonIconActive: {
    color: Colors.text,
    opacity: 1,
  },

  /* -- Search -- */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    color: Colors.textTertiary,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },

  /* -- Filters -- */
  filtersContainer: {
    marginTop: 12,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    color: Colors.card,
  },

  /* -- Summary row -- */
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 20,
  },
  summaryUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
  },
  summaryLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  /* -- List -- */
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },

  /* -- Grid layout -- */
  gridRow: {
    gap: 12,
  },

  /* -- Item card (list mode) -- */
  itemCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  stockIndicator: {
    width: 4,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  itemContent: {
    flex: 1,
  },

  /* Top row: name + badge */
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  itemName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  itemSku: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  itemTopRight: {
    alignItems: "flex-end",
  },
  stockBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },

  /* Weight display */
  weightRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  weightValue: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  weightUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },

  /* Detail row */
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  detailLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* Meta row */
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 12,
    marginHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 20,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* Action buttons */
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  actionButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },

  /* -- Grid card -- */
  gridCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  gridStockIndicator: {
    height: 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  gridContent: {
    padding: 12,
    gap: 6,
  },
  gridItemName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  gridWeightValue: {
    fontFamily: "JetBrainsMono-SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginTop: 4,
  },
  gridWeightUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  gridActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  gridActionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  gridActionText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.sky,
  },

  /* -- Empty / Loading -- */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* -- Adjust Weight Modal -- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  modalSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalInput: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.text,
  },
  modalInputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalCancelText: {
    fontFamily: "DMSans-Medium",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  modalSubmitButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.safety,
  },
  modalSubmitDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
});
