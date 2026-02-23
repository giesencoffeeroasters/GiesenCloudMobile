import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line, Rect } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type {
  ServiceAppointmentListItem,
  ServiceAppointmentPlannedStatus,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStatusColor(status: ServiceAppointmentPlannedStatus): string {
  switch (status) {
    case "requested":
      return Colors.sky;
    case "proposal":
      return Colors.sun;
    case "confirmed":
      return Colors.leaf;
    case "executed":
      return Colors.leaf;
    case "declined":
      return Colors.traffic;
  }
}

function getStatusBg(status: ServiceAppointmentPlannedStatus): string {
  switch (status) {
    case "requested":
      return Colors.skyBg;
    case "proposal":
      return Colors.sunBg;
    case "confirmed":
      return Colors.leafBg;
    case "executed":
      return Colors.leafBg;
    case "declined":
      return Colors.trafficBg;
  }
}

function getStatusLabel(status: ServiceAppointmentPlannedStatus): string {
  switch (status) {
    case "requested":
      return "Requested";
    case "proposal":
      return "Proposal";
    case "confirmed":
      return "Confirmed";
    case "executed":
      return "Executed";
    case "declined":
      return "Declined";
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Not scheduled";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function PlusIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line
        x1="12"
        y1="5"
        x2="12"
        y2="19"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LocationIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 10a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter config                                                      */
/* ------------------------------------------------------------------ */

type FilterOption = "all" | ServiceAppointmentPlannedStatus;

const FILTER_OPTIONS: {
  key: FilterOption;
  label: string;
  color?: string;
}[] = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested", color: Colors.sky },
  { key: "proposal", label: "Proposal", color: Colors.sun },
  { key: "confirmed", label: "Confirmed", color: Colors.leaf },
  { key: "executed", label: "Executed", color: Colors.leaf },
  { key: "declined", label: "Declined", color: Colors.traffic },
];

/* ------------------------------------------------------------------ */
/*  Appointment Card                                                   */
/* ------------------------------------------------------------------ */

function AppointmentCard({ item }: { item: ServiceAppointmentListItem }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/service-appointments/${item.id}`)}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardSerial} numberOfLines={1}>
          {item.machine_serial_number ?? "No Serial"}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBg(item.planned_status) },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: getStatusColor(item.planned_status) },
            ]}
          >
            {getStatusLabel(item.planned_status)}
          </Text>
        </View>
      </View>

      {item.asset ? (
        <Text style={styles.cardAssetName} numberOfLines={1}>
          {item.asset.name}
        </Text>
      ) : null}

      {item.work_type ? (
        <Text style={styles.cardWorkType} numberOfLines={1}>
          {item.work_type.title}
        </Text>
      ) : null}

      <View style={styles.cardMetaRow}>
        {item.work_date ? (
          <View style={styles.cardMetaItem}>
            <CalendarIcon color={Colors.textTertiary} />
            <Text style={styles.cardMetaText}>{formatDate(item.work_date)}</Text>
          </View>
        ) : null}

        {item.destination ? (
          <View style={styles.cardMetaItem}>
            <LocationIcon color={Colors.textTertiary} />
            <Text style={styles.cardMetaText} numberOfLines={1}>
              {item.destination}
            </Text>
          </View>
        ) : null}
      </View>

      {item.display_cost ? (
        <Text style={styles.cardCost}>
          {item.display_cost_label ? `${item.display_cost_label}: ` : ""}
          {item.display_cost}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function ServiceAppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<ServiceAppointmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAppointments = useCallback(
    async (
      status?: ServiceAppointmentPlannedStatus,
      pageNum: number = 1,
      append: boolean = false
    ) => {
      try {
        const params: Record<string, string> = {
          per_page: "20",
          page: String(pageNum),
        };
        if (status) {
          params.status = status;
        }
        const response = await apiClient.get("/service-appointments", { params });
        const data = response.data.data;
        const meta = response.data.meta;

        if (append) {
          setAppointments((prev) => [...prev, ...data]);
        } else {
          setAppointments(data);
        }
        setPage(meta?.current_page ?? pageNum);
        setLastPage(meta?.last_page ?? 1);
      } catch (error) {
        console.error("Failed to fetch service appointments:", error);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const statusParam =
        activeFilter !== "all"
          ? (activeFilter as ServiceAppointmentPlannedStatus)
          : undefined;
      fetchAppointments(statusParam, 1).finally(() => setIsLoading(false));
    }, [fetchAppointments, activeFilter])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const statusParam =
      activeFilter !== "all"
        ? (activeFilter as ServiceAppointmentPlannedStatus)
        : undefined;
    await fetchAppointments(statusParam, 1);
    setIsRefreshing(false);
  }, [fetchAppointments, activeFilter]);

  const onFilterPress = useCallback(
    (filter: FilterOption) => {
      setActiveFilter(filter);
      setIsLoading(true);
      const statusParam =
        filter !== "all"
          ? (filter as ServiceAppointmentPlannedStatus)
          : undefined;
      fetchAppointments(statusParam, 1).finally(() => setIsLoading(false));
    },
    [fetchAppointments]
  );

  const onEndReached = useCallback(() => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    const statusParam =
      activeFilter !== "all"
        ? (activeFilter as ServiceAppointmentPlannedStatus)
        : undefined;
    fetchAppointments(statusParam, page + 1, true).finally(() =>
      setLoadingMore(false)
    );
  }, [loadingMore, page, lastPage, activeFilter, fetchAppointments]);

  /* ── Loading state ── */
  if (isLoading && appointments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.gLogo}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Service Appointments</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/service-appointments/create")}
          >
            <PlusIcon />
          </TouchableOpacity>
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
          <View style={styles.gLogo}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Service Appointments</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerAddBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/service-appointments/create")}
        >
          <PlusIcon />
        </TouchableOpacity>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                isActive && {
                  backgroundColor:
                    option.color ?? Colors.safety,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => onFilterPress(option.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={appointments}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <AppointmentCard item={item} />}
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
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={Colors.slate} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No service appointments found.</Text>
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
    flex: 1,
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
  filterChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: "#ffffff",
  },
  filterChipTextActive: {
    color: Colors.slate,
  },

  /* -- List -- */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },

  /* -- Card -- */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardSerial: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
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
  cardAssetName: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  cardWorkType: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardMetaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 2,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cardCost: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
    marginTop: 2,
  },

  /* -- Footer / Empty -- */
  loadingMore: {
    paddingVertical: 16,
    alignItems: "center",
  },
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
