import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Colors } from "@/constants/colors";

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  type: string;
  currentStock: number;
  unit: string;
  lowStockThreshold: number;
  location: string;
}

type FilterOption = "All" | "Green Beans" | "Roasted" | "Blends";

const FILTER_OPTIONS: FilterOption[] = ["All", "Green Beans", "Roasted", "Blends"];

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    name: "Ethiopia Yirgacheffe Grade 1",
    sku: "GRN-ETH-001",
    type: "Green Beans",
    currentStock: 45.2,
    unit: "kg",
    lowStockThreshold: 20,
    location: "Warehouse A",
  },
  {
    id: 2,
    name: "Brazil Santos Natural",
    sku: "GRN-BRZ-004",
    type: "Green Beans",
    currentStock: 8.5,
    unit: "kg",
    lowStockThreshold: 15,
    location: "Warehouse A",
  },
  {
    id: 3,
    name: "House Blend Medium Roast",
    sku: "RST-HBM-001",
    type: "Roasted",
    currentStock: 12.8,
    unit: "kg",
    lowStockThreshold: 10,
    location: "Roastery",
  },
  {
    id: 4,
    name: "Colombia Supremo",
    sku: "GRN-COL-002",
    type: "Green Beans",
    currentStock: 2.1,
    unit: "kg",
    lowStockThreshold: 10,
    location: "Warehouse B",
  },
  {
    id: 5,
    name: "Morning Blend",
    sku: "BLD-MOR-001",
    type: "Blends",
    currentStock: 22.0,
    unit: "kg",
    lowStockThreshold: 8,
    location: "Roastery",
  },
];

function getStockStatus(item: InventoryItem): "ok" | "low" | "critical" {
  const ratio = item.currentStock / item.lowStockThreshold;
  if (ratio <= 0.5) {
    return "critical";
  }
  if (item.currentStock <= item.lowStockThreshold) {
    return "low";
  }
  return "ok";
}

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

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");

  const filteredItems = MOCK_INVENTORY.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || item.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const totalItems = MOCK_INVENTORY.length;
  const lowStockCount = MOCK_INVENTORY.filter(
    (item) => getStockStatus(item) !== "ok"
  ).length;
  const totalWeight = MOCK_INVENTORY.reduce(
    (sum, item) => sum + item.currentStock,
    0
  );

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    const stockColor = getStockColor(status);
    const isLowStock = status !== "ok";

    return (
      <TouchableOpacity style={styles.itemCard} activeOpacity={0.7}>
        <View style={[styles.stockIndicator, { backgroundColor: stockColor }]} />
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemSku}>{item.sku}</Text>
            </View>
            <View style={styles.stockDisplay}>
              <Text style={styles.stockValue}>{item.currentStock}</Text>
              <Text style={styles.stockUnit}>{item.unit}</Text>
            </View>
          </View>
          <View style={styles.itemFooter}>
            <View style={styles.locationBadge}>
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
            {isLowStock && (
              <View
                style={[
                  styles.warningBadge,
                  {
                    backgroundColor:
                      status === "critical" ? "#fef2f2" : "#fffbeb",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.warningText,
                    {
                      color:
                        status === "critical" ? Colors.traffic : "#b45309",
                    },
                  ]}
                >
                  {status === "critical" ? "Critical" : "Low Stock"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
      </View>

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

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalItems}</Text>
          <Text style={styles.summaryLabel}>Total Items</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.sun }]}>
            {lowStockCount}
          </Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalWeight.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Total Weight (kg)</Text>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No inventory items found.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: 20,
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
    fontFamily: "DMSans-Bold",
    fontSize: 20,
    color: Colors.text,
  },
  summaryLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  stockIndicator: {
    width: 3,
  },
  itemContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    fontSize: 12,
    color: Colors.textTertiary,
  },
  stockDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  stockValue: {
    fontFamily: "DMSans-Bold",
    fontSize: 22,
    color: Colors.text,
  },
  stockUnit: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationBadge: {
    backgroundColor: Colors.bg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  locationText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  warningBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warningText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: {
    fontFamily: "DMSans-Bold",
    fontSize: 26,
    color: Colors.card,
    lineHeight: 28,
  },
});
