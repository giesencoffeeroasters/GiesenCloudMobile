import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import Svg, {
  Path,
  Polyline,
  Rect,
  Line,
  Circle,
} from "react-native-svg";
import { Colors } from "@/constants/colors";
import { ALL_TABS, type TabKey } from "@/constants/tabConfig";
import { useTabStore } from "@/stores/tabStore";

type IconName = TabKey | "More";

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

export function TabIcon({ name, focused }: TabIconProps) {
  const strokeColor = focused ? Colors.textSecondary : Colors.textTertiary;

  const svgProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: strokeColor,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const icons: Record<IconName, React.ReactNode> = {
    Dashboard: (
      <Svg {...svgProps}>
        <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <Polyline points="9 22 9 12 15 12 15 22" />
      </Svg>
    ),
    Roasts: (
      <Svg {...svgProps}>
        <Path d="M12 20V10M18 20V4M6 20v-4" />
      </Svg>
    ),
    Planning: (
      <Svg {...svgProps}>
        <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <Line x1="16" y1="2" x2="16" y2="6" />
        <Line x1="8" y1="2" x2="8" y2="6" />
        <Line x1="3" y1="10" x2="21" y2="10" />
      </Svg>
    ),
    Inventory: (
      <Svg {...svgProps}>
        <Path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </Svg>
    ),
    Quality: (
      <Svg {...svgProps}>
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </Svg>
    ),
    Equipment: (
      <Svg {...svgProps}>
        <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </Svg>
    ),
    Reports: (
      <Svg {...svgProps}>
        <Line x1="18" y1="20" x2="18" y2="10" />
        <Line x1="12" y1="20" x2="12" y2="4" />
        <Line x1="6" y1="20" x2="6" y2="14" />
      </Svg>
    ),
    GiesenLive: (
      <Svg {...svgProps}>
        <Rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <Line x1="8" y1="21" x2="16" y2="21" />
        <Line x1="12" y1="17" x2="12" y2="21" />
      </Svg>
    ),
    More: (
      <Svg {...svgProps}>
        <Circle cx="12" cy="12" r="1" />
        <Circle cx="12" cy="5" r="1" />
        <Circle cx="12" cy="19" r="1" />
      </Svg>
    ),
  };

  return (
    <View
      style={[
        styles.iconWrapper,
        focused && styles.iconWrapperActive,
      ]}
    >
      {icons[name]}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab route map                                                       */
/* ------------------------------------------------------------------ */

const TAB_KEY_TO_ROUTE = Object.fromEntries(
  ALL_TABS.map((t) => [t.key, t.route])
) as Record<TabKey, string>;

const TAB_KEY_TO_TITLE = Object.fromEntries(
  ALL_TABS.map((t) => [t.key, t.title])
) as Record<TabKey, string>;

/* ------------------------------------------------------------------ */
/*  Layout                                                              */
/* ------------------------------------------------------------------ */

export default function TabLayout() {
  const { tabOrder, isLoaded, loadTabOrder } = useTabStore();

  useEffect(() => {
    loadTabOrder();
  }, []);

  if (!isLoaded) {
    return null;
  }

  const selectedSet = new Set(tabOrder);

  // Build ordered list: selected tabs first, then unselected (hidden)
  const unselected = ALL_TABS.filter((t) => !selectedSet.has(t.key));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.textSecondary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* Selected tabs in user's order */}
      {tabOrder.map((key) => (
        <Tabs.Screen
          key={key}
          name={TAB_KEY_TO_ROUTE[key]}
          options={{
            title: TAB_KEY_TO_TITLE[key],
            tabBarIcon: ({ focused }) => (
              <TabIcon name={key} focused={focused} />
            ),
          }}
        />
      ))}

      {/* Unselected tabs — hidden from tab bar */}
      {unselected.map((tab) => (
        <Tabs.Screen
          key={tab.key}
          name={tab.route}
          options={{
            href: null,
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon name={tab.key} focused={focused} />
            ),
          }}
        />
      ))}

      {/* More tab — always last */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="More" focused={focused} />
          ),
        }}
      />
    </Tabs>
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
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 28,
    borderRadius: 8,
  },
  iconWrapperActive: {
    backgroundColor: Colors.slate,
  },
});
