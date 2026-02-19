import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

interface TabIconProps {
  label: string;
  focused: boolean;
}

function TabIcon({ label, focused }: TabIconProps) {
  const icons: Record<string, string> = {
    Dashboard: "\u2302",
    Roasts: "\u2668",
    Planning: "\u2637",
    Inventory: "\u25A3",
    Quality: "\u2605",
    More: "\u2026",
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[
          styles.tabIconText,
          { color: focused ? Colors.slate : Colors.textTertiary },
        ]}
      >
        {icons[label] ?? "?"}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.slate,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="roasts"
        options={{
          title: "Roasts",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Roasts" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: "Planning",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Planning" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Inventory" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="quality"
        options={{
          title: "Quality",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Quality" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="More" focused={focused} />
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
    fontSize: 11,
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
  tabIconText: {
    fontSize: 22,
    lineHeight: 28,
  },
});
