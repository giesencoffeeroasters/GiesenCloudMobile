import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line, Circle as SvgCircle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { TicketListItem, TicketPipelineStage } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("closed") || lower.includes("resolved")) return Colors.leaf;
  if (lower.includes("waiting") || lower.includes("pending")) return Colors.sun;
  if (lower.includes("open") || lower.includes("new")) return Colors.sky;
  if (lower.includes("escalat")) return Colors.traffic;
  return Colors.boven;
}

function getStatusBg(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("closed") || lower.includes("resolved")) return Colors.leafBg;
  if (lower.includes("waiting") || lower.includes("pending")) return Colors.sunBg;
  if (lower.includes("open") || lower.includes("new")) return Colors.skyBg;
  if (lower.includes("escalat")) return Colors.trafficBg;
  return Colors.bovenBg;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgCircle
        cx={11}
        cy={11}
        r={8}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={21}
        y1={21}
        x2={16.65}
        y2={16.65}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line
        x1={12}
        y1={5}
        x2={12}
        y2={19}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TicketIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12h6M9 16h6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Ticket Card                                             */
/* ------------------------------------------------------------------ */

function TicketCard({ ticket }: { ticket: TicketListItem }) {
  return (
    <TouchableOpacity
      style={styles.ticketCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/support/${ticket.id}`)}
    >
      <View style={styles.ticketTopRow}>
        <Text style={styles.ticketSubject} numberOfLines={2}>
          {ticket.subject}
        </Text>
        {ticket.unread_count > 0 && (
          <View style={styles.unreadDot} />
        )}
      </View>

      <View style={styles.ticketMetaRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBg(ticket.status) },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: getStatusColor(ticket.status) },
            ]}
          >
            {ticket.status}
          </Text>
        </View>

        <Text style={styles.ticketTimestamp}>
          {formatTimestamp(ticket.updated_at)}
        </Text>
      </View>

      {ticket.asset_name ? (
        <View style={styles.ticketAssetRow}>
          <TicketIcon color={Colors.textTertiary} />
          <Text style={styles.ticketAssetText} numberOfLines={1}>
            {ticket.asset_name}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [statuses, setStatuses] = useState<TicketPipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await apiClient.get("/tickets/statuses");
      const data = response.data.data ?? response.data ?? [];
      setStatuses(data);
    } catch (error) {
      console.error("Failed to fetch ticket statuses:", error);
    }
  }, []);

  const fetchTickets = useCallback(
    async (
      pageNum: number = 1,
      searchQuery?: string,
      statusFilter?: string,
      isRefresh: boolean = false
    ) => {
      try {
        const params: Record<string, string | number> = {
          per_page: 20,
          page: pageNum,
        };
        if (searchQuery?.trim()) {
          params.search = searchQuery.trim();
        }
        if (statusFilter && statusFilter !== "all") {
          params.status = statusFilter;
        }

        const response = await apiClient.get("/tickets", { params });
        const responseData = response.data.data ?? response.data;
        const items: TicketListItem[] = responseData.data ?? responseData ?? [];
        const lastPage = responseData.last_page ?? 1;

        if (isRefresh || pageNum === 1) {
          setTickets(items);
        } else {
          setTickets((prev) => [...prev, ...items]);
        }

        setHasMore(pageNum < lastPage);
        setPage(pageNum);
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
      }
    },
    []
  );

  const loadData = useCallback(
    async (filter?: string, query?: string) => {
      await fetchTickets(1, query ?? search, filter ?? activeFilter, true);
    },
    [fetchTickets, search, activeFilter]
  );

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
      loadData().finally(() => setIsLoading(false));
    }, [loadData, fetchStatuses])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const onFilterPress = useCallback(
    (filter: string) => {
      setActiveFilter(filter);
      setIsLoading(true);
      fetchTickets(1, search, filter, true).finally(() =>
        setIsLoading(false)
      );
    },
    [fetchTickets, search]
  );

  const onSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        setIsLoading(true);
        fetchTickets(1, text, activeFilter, true).finally(() =>
          setIsLoading(false)
        );
      }, 400);
    },
    [fetchTickets, activeFilter]
  );

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchTickets(page + 1, search, activeFilter).finally(() =>
      setLoadingMore(false)
    );
  }, [hasMore, loadingMore, page, search, activeFilter, fetchTickets]);

  /* ── Loading state ── */
  if (isLoading && tickets.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.gLogo}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Support & Contact</Text>
              <Text style={styles.headerSubtitle}>Tickets</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/support/create")}
          >
            <PlusIcon color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  /* ── Render ticket item ── */
  const renderTicket = ({ item }: { item: TicketListItem }) => (
    <TicketCard ticket={item} />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.textSecondary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.gLogo}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Support & Contact</Text>
            <Text style={styles.headerSubtitle}>Tickets</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerAddBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/support/create")}
        >
          <PlusIcon color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === "all" && styles.filterChipActive,
          ]}
          activeOpacity={0.7}
          onPress={() => onFilterPress("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "all" && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {statuses.map((status) => (
          <TouchableOpacity
            key={status.id}
            style={[
              styles.filterChip,
              activeFilter === status.customer_label && styles.filterChipActive,
            ]}
            activeOpacity={0.7}
            onPress={() => onFilterPress(status.customer_label)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === status.customer_label &&
                  styles.filterChipTextActive,
              ]}
            >
              {status.customer_label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search tickets..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTicket}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tickets found.</Text>
          </View>
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  gLogo: {
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
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- Filter chips -- */
  filterRow: {
    backgroundColor: Colors.slate,
    maxHeight: 44,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.headerOverlay,
  },
  filterChipActive: {
    backgroundColor: Colors.safety,
  },
  filterChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: "#ffffff",
  },
  filterChipTextActive: {
    color: Colors.slate,
  },

  /* -- Search bar -- */
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },

  /* -- List -- */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  /* -- Ticket card -- */
  ticketCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  ticketTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  ticketSubject: {
    flex: 1,
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.sky,
    marginTop: 5,
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },
  ticketTimestamp: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  ticketAssetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ticketAssetText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* -- Footer -- */
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },

  /* -- Empty state -- */
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },
});
