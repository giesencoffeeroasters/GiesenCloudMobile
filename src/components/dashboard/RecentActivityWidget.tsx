import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import type { DashboardData } from "@/types";

interface RecentActivityWidgetProps {
  data: DashboardData | null;
}

type ActivityType = "roast_completed" | "order_received" | "stock_alert";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  created_at: string;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "1",
    type: "roast_completed" as const,
    title: "Roast completed",
    description: "Ethiopia Yirgacheffe on W15A",
    created_at: new Date(Date.now() - 32 * 60000).toISOString(),
  },
  {
    id: "2",
    type: "order_received" as const,
    title: "Order received",
    description: "PO-2024-0087 from supplier",
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "3",
    type: "stock_alert" as const,
    title: "Low stock alert",
    description: "Brazil Santos below threshold",
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { iconColor: string; iconBg: string }
> = {
  roast_completed: { iconColor: Colors.leaf, iconBg: Colors.leafBg },
  order_received: { iconColor: Colors.sky, iconBg: Colors.skyBg },
  stock_alert: { iconColor: Colors.traffic, iconBg: Colors.trafficBg },
};

function ActivityIcon({ type }: { type: ActivityType }) {
  const config = ACTIVITY_CONFIG[type];

  const icons: Record<ActivityType, React.ReactNode> = {
    roast_completed: (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M20 6L9 17l-5-5"
          stroke={config.iconColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
    order_received: (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          stroke={config.iconColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
    stock_alert: (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
          stroke={config.iconColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  };

  return (
    <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
      {icons[type]}
    </View>
  );
}

interface ActivityRowProps {
  activity: ActivityItem;
  isLast: boolean;
}

function ActivityRow({ activity, isLast }: ActivityRowProps) {
  return (
    <View style={[styles.activityRow, !isLast && styles.activityRowBorder]}>
      <ActivityIcon type={activity.type} />
      <View style={styles.activityContent}>
        <Text style={styles.activityDescription}>
          {activity.description}
        </Text>
        <Text style={styles.activityTimestamp}>
          {formatRelativeTime(activity.created_at)}
        </Text>
      </View>
    </View>
  );
}

export function RecentActivityWidget({ data: _data }: RecentActivityWidgetProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>
      <View style={styles.activityCard}>
        {MOCK_ACTIVITIES.map((activity, index) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            isLast={index === MOCK_ACTIVITIES.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  activityCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 2,
  },
  activityTimestamp: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
