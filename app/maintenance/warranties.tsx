import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import apiClient from "@/api/client";
import type { WarrantyListItem, WarrantyStatus } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getWarrantyColor(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return Colors.leaf;
    case "suspended":
      return Colors.sun;
    case "expired":
      return Colors.traffic;
    case "voided":
      return Colors.textTertiary;
  }
}

function getWarrantyBg(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return Colors.leafBg;
    case "suspended":
      return Colors.sunBg;
    case "expired":
      return Colors.trafficBg;
    case "voided":
      return Colors.gravelLight;
  }
}

function getWarrantyLabel(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "expired":
      return "Expired";
    case "voided":
      return "Voided";
  }
}

function getComplianceColor(score: number): string {
  if (score >= 80) return Colors.leaf;
  if (score >= 60) return Colors.sun;
  return Colors.traffic;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
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

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Warranty Card                                           */
/* ------------------------------------------------------------------ */

function WarrantyCard({ item }: { item: WarrantyListItem }) {
  const compColor = getComplianceColor(item.compliance_score);
  const pct = Math.min(100, Math.max(0, item.compliance_score));

  return (
    <TouchableOpacity
      style={styles.warrantyCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/maintenance/warranty/${item.id}`)}
    >
      <Text style={styles.assetName} numberOfLines={1}>
        {item.asset_name}
      </Text>

      {/* Status badge */}
      <View
        style={[
          styles.warrantyBadge,
          { backgroundColor: getWarrantyBg(item.status) },
        ]}
      >
        <ShieldIcon color={getWarrantyColor(item.status)} />
        <Text
          style={[
            styles.warrantyBadgeText,
            { color: getWarrantyColor(item.status) },
          ]}
        >
          {getWarrantyLabel(item.status)}
        </Text>
      </View>

      {/* Compliance score */}
      <Text style={[styles.complianceScore, { color: compColor }]}>
        {item.compliance_score}%
      </Text>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${pct}%`, backgroundColor: compColor },
          ]}
        />
      </View>

      {/* Expiry date */}
      <Text style={styles.expiryText}>
        Expires: {formatDate(item.expires_at)}
      </Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function WarrantiesScreen() {
  const insets = useSafeAreaInsets();
  const [warranties, setWarranties] = useState<WarrantyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchWarranties = useCallback(async () => {
    try {
      const response = await apiClient.get("/maintenance/warranties");
      setWarranties(response.data.data);
    } catch (error) {
      console.error("Failed to fetch warranties:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWarranties().finally(() => setIsLoading(false));
    }, [fetchWarranties])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchWarranties();
    setIsRefreshing(false);
  }, [fetchWarranties]);

  const renderItem = ({ item }: { item: WarrantyListItem }) => (
    <WarrantyCard item={item} />
  );

  return (
    <View style={styles.screen}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Warranties</Text>
      </View>

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      ) : (
        <FlatList
          data={warranties}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.slate}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No warranties found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
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
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
  },

  /* -- List -- */
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },

  /* -- Warranty Card -- */
  warrantyCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  assetName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  warrantyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warrantyBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 10,
  },
  complianceScore: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 30,
    letterSpacing: -1,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gravelLight,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  expiryText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
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
