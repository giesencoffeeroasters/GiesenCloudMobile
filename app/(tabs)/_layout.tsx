import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { ALL_TABS, type TabKey } from "@/constants/tabConfig";
import { reconcileTabOrder, useTabStore } from "@/stores/tabStore";
import { DrawerProvider } from "@/contexts/DrawerContext";
import { AppDrawer } from "@/components/AppDrawer";
import { TabIcon } from "@/components/TabIcon";
import { useAuthStore } from "@/stores/authStore";
import { getVisibleTabs } from "@/lib/featureAccess";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/*  Tab route map                                                      */
/* ------------------------------------------------------------------ */

const TAB_KEY_TO_ROUTE = Object.fromEntries(
  ALL_TABS.map((t) => [t.key, t.route])
) as Record<TabKey, string>;

const TAB_KEY_TO_I18N: Record<TabKey, string> = {
  Dashboard: "tabs.dashboard",
  Roasts: "tabs.roasts",
  Planning: "tabs.planning",
  Inventory: "tabs.inventory",
  Quality: "tabs.quality",
  Equipment: "tabs.equipment",
  Maintenance: "tabs.maintenance",
  Reports: "tabs.reports",
  GiesenLive: "tabs.giesenLive",
};

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function TabLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const { tabOrder, isLoaded, loadTabOrder } = useTabStore();
  const visibleTabs = getVisibleTabs(user, ALL_TABS);
  const visibleTabKeys = visibleTabs.map((tab) => tab.key);
  const visibleTabOrder = reconcileTabOrder(tabOrder, visibleTabKeys);
  const hiddenTabs = ALL_TABS.filter((tab) => !visibleTabOrder.includes(tab.key));
  const visibleTabKeySignature = visibleTabKeys.join("|");

  useEffect(() => {
    if (authIsLoading) {
      return;
    }

    loadTabOrder(visibleTabKeys);
  }, [authIsLoading, loadTabOrder, visibleTabKeySignature]);

  if (authIsLoading || !isLoaded) {
    return null;
  }

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: Colors.textSecondary,
            tabBarInactiveTintColor: Colors.textTertiary,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          {visibleTabOrder.map((key) => (
            <Tabs.Screen
              key={key}
              name={TAB_KEY_TO_ROUTE[key]}
              options={{
                title: t(TAB_KEY_TO_I18N[key]),
                tabBarIcon: ({ focused }) => (
                  <TabIcon name={key} focused={focused} />
                ),
              }}
            />
          ))}

          {hiddenTabs.map((tab) => (
            <Tabs.Screen
              key={tab.key}
              name={tab.route}
              options={{
                href: null,
                title: t(TAB_KEY_TO_I18N[tab.key]),
                tabBarIcon: ({ focused }) => (
                  <TabIcon name={tab.key} focused={focused} />
                ),
              }}
            />
          ))}

          {/* Support screens — hidden from tab bar but keep it visible */}
          <Tabs.Screen
            name="support"
            options={{ href: null, title: t("drawer.supportContact") }}
          />
          <Tabs.Screen
            name="knowledge-base"
            options={{ href: null, title: t("drawer.knowledgeBase") }}
          />
          <Tabs.Screen
            name="service-appointments"
            options={{ href: null, title: t("drawer.serviceAppointments") }}
          />

          {/* More tab — hidden from tab bar (replaced by drawer) */}
          <Tabs.Screen
            name="more"
            options={{ href: null, title: t("tabs.more") }}
          />
        </Tabs>
        <AppDrawer />
      </View>
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabBarLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
});
