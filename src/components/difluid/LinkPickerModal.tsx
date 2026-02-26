import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { Colors } from "@/constants/colors";
import apiClient from "@/api/client";

interface LinkPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: {
    type: "inventory" | "roast";
    id: string | number;
    name: string;
  }) => void;
}

interface SearchItem {
  id: string | number;
  name?: string;
  profile_name?: string;
  created_at?: string;
  roasted_at?: string;
}

function SearchIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.textTertiary}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

export function LinkPickerModal({
  visible,
  onClose,
  onSelect,
}: LinkPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"roast" | "inventory">("roast");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === "roast" ? "/roasts" : "/inventory";
      const params: Record<string, string> = {};
      if (search.trim()) {
        params.search = search.trim();
      }
      const response = await apiClient.get(endpoint, { params });
      const data = response.data.data ?? response.data;
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [visible, fetchItems]);

  useEffect(() => {
    if (visible) {
      setSearch("");
      setItems([]);
      fetchItems();
    }
  }, [visible, tab]);

  function getDisplayName(item: SearchItem): string {
    return item.name ?? item.profile_name ?? `#${item.id}`;
  }

  function handleSelect(item: SearchItem) {
    onSelect({ type: tab, id: item.id, name: getDisplayName(item) });
  }

  function formatDate(item: SearchItem): string {
    const dateStr = item.roasted_at ?? item.created_at;
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Link Measurement</Text>
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <CloseIcon />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === "roast" && styles.tabActive]}
            activeOpacity={0.7}
            onPress={() => setTab("roast")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "roast" && styles.tabTextActive,
              ]}
            >
              Roast
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "inventory" && styles.tabActive]}
            activeOpacity={0.7}
            onPress={() => setTab("inventory")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "inventory" && styles.tabTextActive,
              ]}
            >
              Inventory
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${tab === "roast" ? "roasts" : "inventory"}...`}
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.safety} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemRow}
                activeOpacity={0.6}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {getDisplayName(item)}
                  </Text>
                  <Text style={styles.itemMeta}>
                    ID: {item.id}
                    {formatDate(item) ? `  •  ${formatDate(item)}` : ""}
                  </Text>
                </View>
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={Colors.textTertiary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M9 18l6-6-6-6" />
                </Svg>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {search
                    ? `No ${tab === "roast" ? "roasts" : "inventory items"} found`
                    : `No ${tab === "roast" ? "roasts" : "inventory items"} available`}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.slate,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  tabText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.safety,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  itemMeta: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
