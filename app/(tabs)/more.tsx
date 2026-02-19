import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";

interface MenuRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  value?: string;
}

function MenuRow({ icon, label, onPress, value }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.menuRowLeft}>
        <View style={styles.menuIconContainer}>
          <Text style={styles.menuIcon}>{icon}</Text>
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : onPress ? (
        <Text style={styles.menuChevron}>{">"}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? "Unknown"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
            {user?.current_team?.name ? (
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>
                  {user.current_team.name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Navigation Section */}
        <SectionHeader title="Navigation" />
        <View style={styles.menuSection}>
          <MenuRow icon={"\u2699"} label="Equipment" onPress={() => {}} />
          <MenuRow icon={"\u2753"} label="Support" onPress={() => {}} />
          <MenuRow icon={"\u2709"} label="Purchase Orders" onPress={() => {}} />
        </View>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.menuSection}>
          <MenuRow icon={"\u263A"} label="Profile Settings" onPress={() => {}} />
          <MenuRow icon={"\u2636"} label="Team Settings" onPress={() => {}} />
          <MenuRow icon={"\u266A"} label="Notifications" onPress={() => {}} />
        </View>

        {/* App Section */}
        <SectionHeader title="App" />
        <View style={styles.menuSection}>
          <MenuRow icon={"\u2139"} label="About" onPress={() => {}} />
          <MenuRow icon={"\u26BF"} label="Privacy Policy" onPress={() => {}} />
          <MenuRow icon={"\u2696"} label="Terms of Service" onPress={() => {}} />
          <MenuRow icon={"\u2B59"} label="App Version" value="1.0.0" />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "DMSans-Bold",
    fontSize: 20,
    color: "#ffffff",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  profileEmail: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  teamBadge: {
    backgroundColor: Colors.bg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  teamBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  menuSection: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  menuLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 15,
    color: Colors.text,
  },
  menuChevron: {
    fontFamily: "DMSans-Regular",
    fontSize: 16,
    color: Colors.textTertiary,
  },
  menuValue: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
  logoutButton: {
    marginTop: 32,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: Colors.traffic,
  },
});
