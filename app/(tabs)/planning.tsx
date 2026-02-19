import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { Colors } from "@/constants/colors";

interface Plan {
  id: number;
  time: string;
  profile_name: string;
  green_coffee: string;
  device_name: string;
  batch_size: number;
  status: "Scheduled" | "In Progress" | "Completed";
}

const MOCK_PLANS: Plan[] = [
  {
    id: 1,
    time: "08:00",
    profile_name: "Ethiopia Yirgacheffe Light",
    green_coffee: "Ethiopia Yirgacheffe Grade 1",
    device_name: "W6A",
    batch_size: 5,
    status: "Completed",
  },
  {
    id: 2,
    time: "09:30",
    profile_name: "Colombia Medium",
    green_coffee: "Colombia Supremo Huila",
    device_name: "W15A",
    batch_size: 12,
    status: "In Progress",
  },
  {
    id: 3,
    time: "11:00",
    profile_name: "Guatemala Espresso",
    green_coffee: "Guatemala Antigua SHB",
    device_name: "W30A",
    batch_size: 25,
    status: "Scheduled",
  },
  {
    id: 4,
    time: "14:00",
    profile_name: "Kenya AA Filter",
    green_coffee: "Kenya AA Nyeri",
    device_name: "W6A",
    batch_size: 5,
    status: "Scheduled",
  },
];

const VIEW_OPTIONS = ["Day", "Week", "List"] as const;

type ViewOption = (typeof VIEW_OPTIONS)[number];

const STATUS_COLORS: Record<Plan["status"], string> = {
  Scheduled: Colors.sky,
  "In Progress": Colors.sun,
  Completed: Colors.leaf,
};

function getWeekDays(): { label: string; date: number; isToday: boolean; fullDate: Date }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const days = [];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      label: dayLabels[i],
      date: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      fullDate: date,
    });
  }

  return days;
}

interface PlanCardProps {
  plan: Plan;
}

function PlanCard({ plan }: PlanCardProps) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planTimeContainer}>
        <Text style={styles.planTime}>{plan.time}</Text>
      </View>
      <View style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <Text style={styles.planProfileName}>{plan.profile_name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[plan.status] },
            ]}
          >
            <Text style={styles.statusBadgeText}>{plan.status}</Text>
          </View>
        </View>
        <View style={styles.planDetails}>
          <Text style={styles.planDetailText}>{plan.green_coffee}</Text>
        </View>
        <View style={styles.planMeta}>
          <Text style={styles.planMetaText}>{plan.device_name}</Text>
          <Text style={styles.planMetaSeparator}>{"\u00B7"}</Text>
          <Text style={styles.planMetaData}>{plan.batch_size} kg</Text>
        </View>
      </View>
    </View>
  );
}

export default function PlanningScreen() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<ViewOption>("Day");

  const weekDays = useMemo(() => getWeekDays(), []);

  const currentSelectedDay = selectedDay ?? weekDays.find((d) => d.isToday)?.date ?? weekDays[0].date;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planning</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Date strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContainer}
        style={styles.dateStripScroll}
      >
        {weekDays.map((day) => {
          const isSelected = day.date === currentSelectedDay;
          return (
            <TouchableOpacity
              key={day.label}
              style={[
                styles.dateItem,
                isSelected && styles.dateItemSelected,
              ]}
              onPress={() => setSelectedDay(day.date)}
            >
              <Text
                style={[
                  styles.dateLabel,
                  isSelected && styles.dateLabelSelected,
                ]}
              >
                {day.label}
              </Text>
              <Text
                style={[
                  styles.dateNumber,
                  isSelected && styles.dateNumberSelected,
                ]}
              >
                {day.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* View toggle */}
      <View style={styles.viewToggleContainer}>
        {VIEW_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.viewTogglePill,
              activeView === option && styles.viewTogglePillActive,
            ]}
            onPress={() => setActiveView(option)}
          >
            <Text
              style={[
                styles.viewToggleText,
                activeView === option && styles.viewToggleTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Plan cards */}
      <ScrollView
        style={styles.plansScroll}
        contentContainerStyle={styles.plansContent}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButtonIcon: {
    fontSize: 24,
    color: Colors.text,
    lineHeight: 26,
  },
  dateStripScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  dateStripContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateItem: {
    width: 48,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateItemSelected: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  dateLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  dateLabelSelected: {
    color: Colors.gravelLight,
  },
  dateNumber: {
    fontFamily: "DMSans-Bold",
    fontSize: 18,
    color: Colors.text,
    lineHeight: 22,
  },
  dateNumberSelected: {
    color: Colors.card,
  },
  viewToggleContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  viewTogglePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  viewTogglePillActive: {
    backgroundColor: Colors.slate,
  },
  viewToggleText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  viewToggleTextActive: {
    color: Colors.card,
  },
  plansScroll: {
    flex: 1,
  },
  plansContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  planRow: {
    flexDirection: "row",
    gap: 12,
  },
  planTimeContainer: {
    width: 48,
    paddingTop: 14,
    alignItems: "center",
  },
  planTime: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  planProfileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.card,
  },
  planDetails: {
    marginBottom: 8,
  },
  planDetailText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  planMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  planMetaSeparator: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  planMetaData: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
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
  fabIcon: {
    fontSize: 28,
    color: Colors.card,
    lineHeight: 30,
  },
});
