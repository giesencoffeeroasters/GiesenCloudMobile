import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, {
  Path,
  Circle,
  Line,
  Rect,
  Polyline,
} from "react-native-svg";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { useTabStore } from "@/stores/tabStore";
import apiClient from "@/api/client";

/* ------------------------------------------------------------------ */
/*  SVG Icon components (18x18, viewBox 0 0 24 24, strokeWidth 1.8)   */
/* ------------------------------------------------------------------ */

function EquipmentIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function MaintenanceIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Svg>
  );
}

function ReportsIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="20" x2="18" y2="10" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="6" y1="20" x2="6" y2="14" />
    </Svg>
  );
}

function LiveIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <Line x1="8" y1="21" x2="16" y2="21" />
      <Line x1="12" y1="17" x2="12" y2="21" />
    </Svg>
  );
}

function SupportIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <Line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  );
}

function KnowledgeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

function ServiceIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

function CompanyIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

function BillingIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <Line x1="1" y1="10" x2="23" y2="10" />
    </Svg>
  );
}

function DownloadsIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  );
}

function NotificationsIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

function AboutIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="16" x2="12" y2="12" />
      <Line x1="12" y1="8" x2="12.01" y2="8" />
    </Svg>
  );
}

function TabOrderIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="4" y1="6" x2="20" y2="6" />
      <Line x1="4" y1="12" x2="20" y2="12" />
      <Line x1="4" y1="18" x2="20" y2="18" />
      <Polyline points="7 3 4 6 7 9" />
      <Polyline points="17 15 20 18 17 21" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.textTertiary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Menu row component                                                 */
/* ------------------------------------------------------------------ */

interface MenuRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
}

function MenuRow({ icon, iconBg, label, onPress, rightElement, isLast }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      {rightElement ? rightElement : onPress ? <ChevronRight /> : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Team type                                                          */
/* ------------------------------------------------------------------ */

interface Team {
  id: number;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, loadUser } = useAuthStore();
  const { tabOrder } = useTabStore();

  // Team switch modal state
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [switchingTeamId, setSwitchingTeamId] = useState<number | null>(null);

  // About modal state
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  /* -- Handlers -- */

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

  const handleSwitchTeamOpen = useCallback(async () => {
    setTeamModalVisible(true);
    setTeamsLoading(true);
    try {
      const response = await apiClient.get("/teams");
      setTeams(response.data.data ?? response.data);
    } catch {
      Alert.alert("Error", "Could not load teams. Please try again.");
      setTeamModalVisible(false);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const handleSwitchTeam = useCallback(
    async (teamId: number) => {
      setSwitchingTeamId(teamId);
      try {
        await apiClient.post("/teams/switch", { team_id: teamId });
        await loadUser();
        setTeamModalVisible(false);
      } catch {
        Alert.alert("Error", "Could not switch team. Please try again.");
      } finally {
        setSwitchingTeamId(null);
      }
    },
    [loadUser]
  );

  function handleSupportContact() {
    router.push("/support" as any);
  }

  function handleKnowledgeBase() {
    router.push("/knowledge-base" as any);
  }

  function handleServiceAppointments() {
    router.push("/service-appointments" as any);
  }

  function handleCompanySettings() {
    Alert.alert(
      "Company Settings",
      "Company settings such as team management, locations, and branding are available on the desktop version. Visit giesen.cloud to manage your company settings.",
      [
        { text: "OK", style: "cancel" },
        {
          text: "Open in Browser",
          onPress: () => Linking.openURL("https://giesen.cloud/settings"),
        },
      ]
    );
  }

  function handleBilling() {
    Linking.openURL("https://giesen.cloud/billing");
  }

  function handleDownloads() {
    Alert.alert(
      "Downloads",
      "Software downloads including profiler updates and firmware files are available on the desktop version. Visit giesen.cloud/downloads in your browser.",
      [
        { text: "OK", style: "cancel" },
        {
          text: "Open in Browser",
          onPress: () => Linking.openURL("https://giesen.cloud/downloads"),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>More</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? "Unknown"}</Text>
            {user?.email ? (
              <Text style={styles.emailText}>{user.email}</Text>
            ) : null}
            {user?.current_team?.name ? (
              <Text style={styles.teamName}>{user.current_team.name}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.switchTeamButton}
            activeOpacity={0.7}
            onPress={handleSwitchTeamOpen}
          >
            <Text style={styles.switchTeamText}>Switch Team</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation — only show screens not in the user's active tabs */}
        {(() => {
          const selectedSet = new Set(tabOrder);
          const navItems: { key: string; icon: React.ReactNode; iconBg: string; label: string; route: string }[] = [];

          if (!selectedSet.has("Equipment")) {
            navItems.push({
              key: "Equipment",
              icon: <EquipmentIcon color={Colors.sky} />,
              iconBg: Colors.skyBg,
              label: "Equipment",
              route: "/equipment",
            });
          }
          if (!selectedSet.has("Reports")) {
            navItems.push({
              key: "Reports",
              icon: <ReportsIcon color={Colors.grape} />,
              iconBg: Colors.grapeBg,
              label: "Reports",
              route: "/reports",
            });
          }
          if (!selectedSet.has("Maintenance")) {
            navItems.push({
              key: "Maintenance",
              icon: <MaintenanceIcon color={Colors.boven} />,
              iconBg: Colors.bovenBg,
              label: "Maintenance",
              route: "/maintenance",
            });
          }
          if (!selectedSet.has("GiesenLive")) {
            navItems.push({
              key: "GiesenLive",
              icon: (
                <View>
                  <LiveIcon color={Colors.leaf} />
                  <View style={styles.liveDot} />
                </View>
              ),
              iconBg: Colors.leafBg,
              label: "Giesen Live",
              route: "/giesen-live",
            });
          }

          if (navItems.length === 0) return null;

          return (
            <>
              <SectionHeader title="Navigation" />
              <View style={styles.menuSection}>
                {navItems.map((item, idx) => (
                  <MenuRow
                    key={item.key}
                    icon={item.icon}
                    iconBg={item.iconBg}
                    label={item.label}
                    onPress={() => router.push(item.route as any)}
                    isLast={idx === navItems.length - 1}
                  />
                ))}
              </View>
            </>
          );
        })()}

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.menuSection}>
          <MenuRow
            icon={<SupportIcon color={Colors.boven} />}
            iconBg={Colors.bovenBg}
            label="Support & Contact"
            onPress={handleSupportContact}
          />
          <MenuRow
            icon={<KnowledgeIcon color={Colors.boven} />}
            iconBg={Colors.bovenBg}
            label="Knowledge Base"
            onPress={handleKnowledgeBase}
          />
          <MenuRow
            icon={<ServiceIcon color={Colors.boven} />}
            iconBg={Colors.bovenBg}
            label="Service Appointments"
            onPress={handleServiceAppointments}
            isLast
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.menuSection}>
          <MenuRow
            icon={<ProfileIcon color={Colors.sky} />}
            iconBg={Colors.skyBg}
            label="Profile Settings"
            onPress={() => router.push("/profile")}
          />
          <MenuRow
            icon={<CompanyIcon color={Colors.sky} />}
            iconBg={Colors.skyBg}
            label="Company Settings"
            onPress={handleCompanySettings}
          />
          <MenuRow
            icon={<BillingIcon color={Colors.sun} />}
            iconBg={Colors.sunBg}
            label="Billing & Subscription"
            onPress={handleBilling}
          />
          <MenuRow
            icon={<DownloadsIcon color={Colors.sun} />}
            iconBg={Colors.sunBg}
            label="Downloads"
            onPress={handleDownloads}
            isLast
          />
        </View>

        {/* App */}
        <SectionHeader title="App" />
        <View style={styles.menuSection}>
          <MenuRow
            icon={<TabOrderIcon color={Colors.slateLight} />}
            iconBg={Colors.gravelLight}
            label="Tab Order"
            onPress={() => router.push("/tab-settings")}
          />
          <MenuRow
            icon={<NotificationsIcon color={Colors.slateLight} />}
            iconBg={Colors.gravelLight}
            label="Notifications"
            onPress={() => router.push("/notifications")}
          />
          <MenuRow
            icon={<AboutIcon color={Colors.slateLight} />}
            iconBg={Colors.gravelLight}
            label="About GiesenCloud"
            onPress={() => setAboutModalVisible(true)}
            rightElement={
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => setAboutModalVisible(true)}
                style={styles.aboutRight}
              >
                <Text style={styles.versionText}>v2.4.1</Text>
                <ChevronRight />
              </TouchableOpacity>
            }
            isLast
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ---- Switch Team Modal ---- */}
      <Modal
        visible={teamModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTeamModalVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Switch Team</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              activeOpacity={0.7}
              onPress={() => setTeamModalVisible(false)}
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          {teamsLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.safety} />
              <Text style={styles.modalLoadingText}>Loading teams...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalList}>
              {teams.map((team) => {
                const isCurrentTeam = team.id === user?.current_team?.id;
                const isSwitching = switchingTeamId === team.id;
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamRow,
                      isCurrentTeam && styles.teamRowActive,
                    ]}
                    activeOpacity={isCurrentTeam ? 1 : 0.6}
                    onPress={() => {
                      if (!isCurrentTeam && !switchingTeamId) {
                        handleSwitchTeam(team.id);
                      }
                    }}
                  >
                    <View style={styles.teamRowLeft}>
                      <View
                        style={[
                          styles.teamDot,
                          isCurrentTeam && styles.teamDotActive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.teamRowName,
                          isCurrentTeam && styles.teamRowNameActive,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </View>
                    {isSwitching ? (
                      <ActivityIndicator size="small" color={Colors.safety} />
                    ) : isCurrentTeam ? (
                      <Text style={styles.teamCurrentLabel}>Current</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ---- About Modal ---- */}
      <Modal
        visible={aboutModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.aboutOverlay}>
          <View
            style={[styles.aboutModal, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.aboutHandle} />
            <View style={styles.aboutLogoRow}>
              <View style={styles.aboutLogoBox}>
                <Text style={styles.aboutLogoText}>G</Text>
              </View>
            </View>
            <Text style={styles.aboutAppName}>GiesenCloud</Text>
            <Text style={styles.aboutVersion}>Version 2.4.1</Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutCopyright}>
              {"\u00A9"} {new Date().getFullYear()} Giesen Coffee Roasters B.V.
            </Text>
            <Text style={styles.aboutDescription}>
              Roastery management platform with profiler integration, inventory
              tracking, and live roaster monitoring.
            </Text>
            <TouchableOpacity
              style={styles.aboutCloseBtn}
              activeOpacity={0.7}
              onPress={() => setAboutModalVisible(false)}
            >
              <Text style={styles.aboutCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  /* Header */
  header: {
    backgroundColor: Colors.slate,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
    marginBottom: 16,
  },

  /* Profile card */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.slateLight,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "DMSans-Bold",
    fontSize: 18,
    color: "#ffffff",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
  emailText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  teamName: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
  },
  switchTeamButton: {
    backgroundColor: Colors.headerOverlay,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchTeamText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.safety,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  /* Section headers */
  sectionHeader: {
    paddingHorizontal: 4,
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

  /* Menu sections */
  menuSection: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },

  /* Live dot */
  liveDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.leaf,
  },

  /* About row right side */
  aboutRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  versionText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* Logout */
  logoutButton: {
    marginTop: 28,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.traffic,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  logoutText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.traffic,
  },

  /* ---- Switch Team Modal ---- */
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.slate,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  modalLoadingText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.gravel,
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.headerOverlay,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  teamRowActive: {
    backgroundColor: "rgba(204,255,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(204,255,0,0.25)",
  },
  teamRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gravel,
  },
  teamDotActive: {
    backgroundColor: Colors.safety,
  },
  teamRowName: {
    fontFamily: "DMSans-Medium",
    fontSize: 15,
    color: "#ffffff",
  },
  teamRowNameActive: {
    fontFamily: "DMSans-SemiBold",
    color: Colors.safety,
  },
  teamCurrentLabel: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.safety,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ---- About Modal ---- */
  aboutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  aboutModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  aboutHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  aboutLogoRow: {
    marginBottom: 12,
  },
  aboutLogoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutLogoText: {
    fontFamily: "DMSans-Bold",
    fontSize: 26,
    color: Colors.safety,
  },
  aboutAppName: {
    fontFamily: "DMSans-Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 4,
  },
  aboutVersion: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  aboutDivider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  aboutCopyright: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  aboutDescription: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  aboutCloseBtn: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 48,
    marginBottom: 8,
  },
  aboutCloseBtnText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: "#ffffff",
  },
});
