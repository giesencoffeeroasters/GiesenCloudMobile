import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Polyline, Line } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { ALL_TABS, type TabKey } from "@/constants/tabConfig";
import { reconcileTabOrder, useTabStore } from "@/stores/tabStore";
import { useAuthStore } from "@/stores/authStore";
import { getVisibleTabs } from "@/lib/featureAccess";
import { TabIcon } from "@/components/TabIcon";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/*  Small icon helpers                                                  */
/* ------------------------------------------------------------------ */

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="18 15 12 9 6 15" />
    </Svg>
  );
}

function ArrowDownIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

function RemoveIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

function AddIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const tabTitleMap = new Map(ALL_TABS.map((t) => [t.key, t.title]));

const MIN_TABS = 2;
const MAX_TABS = 5;

/* ------------------------------------------------------------------ */
/*  Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function TabSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const { tabOrder, setTabOrder, resetTabOrder } = useTabStore();
  if (authIsLoading) {
    return null;
  }
  const visibleTabs = getVisibleTabs(user, ALL_TABS);
  const visibleTabKeys = visibleTabs.map((tab) => tab.key);
  const visibleTabOrder = reconcileTabOrder(tabOrder, visibleTabKeys);
  const selectedSet = new Set(visibleTabOrder);
  const available = visibleTabs.filter((tab) => !selectedSet.has(tab.key));

  /* -- Actions -- */

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...visibleTabOrder];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setTabOrder(next);
  }

  function moveDown(index: number) {
    if (index === visibleTabOrder.length - 1) return;
    const next = [...visibleTabOrder];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setTabOrder(next);
  }

  function removeTab(key: TabKey) {
    if (visibleTabOrder.length <= MIN_TABS) return;
    setTabOrder(visibleTabOrder.filter((k) => k !== key));
  }

  function addTab(key: TabKey) {
    if (visibleTabOrder.length >= Math.min(MAX_TABS, visibleTabs.length)) return;
    setTabOrder([...visibleTabOrder, key]);
  }

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
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t("tabSettings.title")}</Text>
              <Text style={styles.headerSubtitle}>{t("tabSettings.subtitle")}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Your Tabs section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>
            {t("tabSettings.visible")} ({visibleTabOrder.length})
          </Text>
        </View>

        <View style={styles.card}>
          {visibleTabOrder.map((key, index) => {
            const isFirst = index === 0;
            const isLast = index === visibleTabOrder.length - 1;
            const canRemove = visibleTabOrder.length > MIN_TABS;

            return (
              <View
                key={key}
                style={[styles.tabRow, isLast && styles.tabRowLast]}
              >
                <View style={styles.tabRowLeft}>
                  <TabIcon name={key} focused={false} />
                  <Text style={styles.tabRowLabel}>
                    {tabTitleMap.get(key) ?? key}
                  </Text>
                </View>

                <View style={styles.tabRowActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, isFirst && styles.actionButtonDisabled]}
                    activeOpacity={isFirst ? 1 : 0.6}
                    onPress={() => moveUp(index)}
                    disabled={isFirst}
                  >
                    <ArrowUpIcon color={isFirst ? Colors.border : Colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, isLast && styles.actionButtonDisabled]}
                    activeOpacity={isLast ? 1 : 0.6}
                    onPress={() => moveDown(index)}
                    disabled={isLast}
                  >
                    <ArrowDownIcon color={isLast ? Colors.border : Colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, !canRemove && styles.actionButtonDisabled]}
                    activeOpacity={canRemove ? 0.6 : 1}
                    onPress={() => removeTab(key)}
                    disabled={!canRemove}
                  >
                    <RemoveIcon color={canRemove ? Colors.traffic : Colors.border} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Available section */}
        {available.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{t("tabSettings.hidden")}</Text>
            </View>

            <View style={styles.card}>
              {available.map((tab, index) => {
                const isLast = index === available.length - 1;
                const canAdd = visibleTabOrder.length < Math.min(MAX_TABS, visibleTabs.length);

                return (
                  <View
                    key={tab.key}
                    style={[styles.tabRow, isLast && styles.tabRowLast]}
                  >
                    <View style={styles.tabRowLeft}>
                      <TabIcon name={tab.key} focused={false} />
                      <Text style={styles.tabRowLabel}>{tab.title}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.actionButton, !canAdd && styles.actionButtonDisabled]}
                      activeOpacity={canAdd ? 0.6 : 1}
                      onPress={() => addTab(tab.key)}
                      disabled={!canAdd}
                    >
                      <AddIcon color={canAdd ? Colors.leaf : Colors.border} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Reset button */}
        <TouchableOpacity
          style={styles.resetButton}
          activeOpacity={0.7}
          onPress={() => resetTabOrder(visibleTabKeys)}
        >
          <Text style={styles.resetButtonText}>{t("tabSettings.reset")}</Text>
        </TouchableOpacity>

        {/* Hint */}
        <Text style={styles.hintText}>
          {t("tabSettings.description")}
        </Text>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

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

  /* -- Scroll -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  /* -- Section header -- */
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

  /* -- Card -- */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },

  /* -- Tab row -- */
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabRowLast: {
    borderBottomWidth: 0,
  },
  tabRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  tabRowLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  tabRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  /* -- Action buttons -- */
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },

  /* -- Reset -- */
  resetButton: {
    marginTop: 28,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.slate,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  resetButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.slate,
  },

  /* -- Hint -- */
  hintText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 16,
  },
});
