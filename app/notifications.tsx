import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import { Notification } from "@/types/index";

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

function getNotificationTitle(notification: Notification): string {
  return notification.data?.title ?? notification.type ?? "Notification";
}

function getNotificationMessage(notification: Notification): string {
  return notification.data?.message ?? notification.data?.body ?? "";
}

function NotificationIcon({ type }: { type: string }) {
  const lowerType = type.toLowerCase();

  if (lowerType.includes("roast") || lowerType.includes("profile")) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M17 8C17 5.24 14.76 3 12 3S7 5.24 7 8c0 4-3 6-3 6h16s-3-2-3-6"
          stroke={Colors.boven}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (lowerType.includes("inventory") || lowerType.includes("stock")) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          stroke={Colors.sky}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // Default bell icon
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={Colors.grape}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={Colors.grape}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      try {
        const response = await apiClient.get("/notifications", {
          params: { page: pageNum, per_page: 20 },
        });

        const responseData = response.data.data;
        const items: Notification[] = responseData.data ?? responseData ?? [];
        const lastPage = responseData.last_page ?? 1;

        if (isRefresh || pageNum === 1) {
          setNotifications(items);
        } else {
          setNotifications((prev) => [...prev, ...items]);
        }

        setHasMore(pageNum < lastPage);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1);
  }, [hasMore, loadingMore, page, fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      await apiClient.post("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAllRead(false);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => {
      const isUnread = !item.read_at;

      return (
        <TouchableOpacity
          style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
          activeOpacity={0.7}
          onPress={() => {
            if (isUnread) {
              handleMarkAsRead(item.id);
            }
          }}
        >
          <View style={styles.notificationRow}>
            <View
              style={[
                styles.notificationIconBox,
                isUnread ? styles.notificationIconBoxUnread : null,
              ]}
            >
              <NotificationIcon type={item.type} />
            </View>

            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text
                  style={[
                    styles.notificationTitle,
                    isUnread && styles.notificationTitleUnread,
                  ]}
                  numberOfLines={1}
                >
                  {getNotificationTitle(item)}
                </Text>
                {isUnread ? <View style={styles.unreadDot} /> : null}
              </View>
              {getNotificationMessage(item) ? (
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {getNotificationMessage(item)}
                </Text>
              ) : null}
              <Text style={styles.notificationTime}>
                {formatTimestamp(item.created_at)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleMarkAsRead]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke={Colors.textTertiary}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              stroke={Colors.textTertiary}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptySubtitle}>
          When there are updates to your roasts, inventory, or team activity,
          they will appear here.
        </Text>
      </View>
    );
  }, [loading]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.textSecondary} />
      </View>
    );
  }, [loadingMore]);

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
            <View>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount > 0 ? `${unreadCount} unread` : "Stay up to date"}
              </Text>
            </View>
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              activeOpacity={0.7}
              onPress={handleMarkAllRead}
              disabled={markingAllRead}
            >
              {markingAllRead ? (
                <ActivityIndicator size="small" color={Colors.safety} />
              ) : (
                <Text style={styles.markAllText}>Mark All Read</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.textSecondary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },
  markAllButton: {
    backgroundColor: Colors.headerOverlay,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.safety,
  },

  /* -- Loading -- */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* -- List -- */
  listContent: {
    padding: 16,
    gap: 10,
  },

  /* -- Notification card -- */
  notificationCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  notificationCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.safety,
  },
  notificationRow: {
    flexDirection: "row",
    gap: 12,
  },
  notificationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIconBoxUnread: {
    backgroundColor: Colors.bg,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  notificationTitleUnread: {
    fontFamily: "DMSans-SemiBold",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.safety,
  },
  notificationMessage: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
  },

  /* -- Footer -- */
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },

  /* -- Empty state -- */
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
