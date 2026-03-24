import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { hasRequiredAccess } from "@/lib/featureAccess";
import type { DashboardData, RoastPlan } from "@/types";

interface ScheduleWidgetProps {
  data: DashboardData | null;
}

function getStatusStyle(status: string, t: (key: string) => string): {
  color: string;
  bg: string;
  label: string;
} {
  switch (status) {
    case "completed":
      return {
        color: Colors.leaf,
        bg: Colors.leafBg,
        label: t("planning.status.completed"),
      };
    case "in_progress":
      return {
        color: Colors.boven,
        bg: Colors.bovenBg,
        label: t("planning.status.inProgress"),
      };
    case "cancelled":
      return {
        color: Colors.traffic,
        bg: Colors.trafficBg,
        label: t("planning.status.completed"),
      };
    default:
      return {
        color: Colors.textTertiary,
        bg: "rgba(0,0,0,0.04)",
        label: t("widgets.pending"),
      };
  }
}

interface ScheduleCardProps {
  plan: RoastPlan;
  t: (key: string) => string;
}

function ScheduleCard({ plan, t }: ScheduleCardProps) {
  const status = getStatusStyle(plan.status, t);

  return (
    <View style={styles.scheduleCard}>
      <Text style={styles.scheduleTime}>#{plan.order}</Text>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleProfileName} numberOfLines={1}>
          {plan.profile.name}
        </Text>
        <View style={styles.scheduleMeta}>
          <Text style={styles.scheduleMetaText}>{plan.device.name}</Text>
          <Text style={styles.scheduleMetaSeparator}>{" \u00B7 "}</Text>
          <Text style={styles.scheduleMetaText}>{(plan.batch_size / 1000).toFixed(1)} kg</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
    </View>
  );
}

export function ScheduleWidget({ data }: ScheduleWidgetProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  if (
    !hasRequiredAccess(user, {
      requiresCapabilities: ["roast_planning"],
      requiresFeatures: ["roast_planning"],
    })
  ) {
    return null;
  }

  const scheduleItems =
    data?.schedule
      ?.filter((p) => p.status !== "completed" && p.status !== "cancelled")
      .slice(0, 5) ?? [];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("widgets.schedule")}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/planning")}
        >
          <Text style={styles.viewAllLink}>{t("common.viewAll")}</Text>
        </TouchableOpacity>
      </View>
      {scheduleItems.length > 0 ? (
        <View style={styles.scheduleList}>
          {scheduleItems.map((plan) => (
            <ScheduleCard key={plan.id} plan={plan} t={t} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {t("widgets.noSchedule")}
          </Text>
        </View>
      )}
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
  viewAllLink: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },
  scheduleList: {
    gap: 10,
  },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  scheduleTime: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.text,
    minWidth: 42,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleProfileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  scheduleMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scheduleMetaSeparator: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    textTransform: "capitalize",
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
