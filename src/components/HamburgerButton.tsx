import { TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Line } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { useDrawer } from "@/contexts/DrawerContext";

export function HamburgerButton() {
  const { openDrawer } = useDrawer();

  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.7}
      onPress={openDrawer}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Line
          x1="3" y1="6" x2="21" y2="6"
          stroke={Colors.text}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1="3" y1="12" x2="21" y2="12"
          stroke={Colors.text}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1="3" y1="18" x2="21" y2="18"
          stroke={Colors.text}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.safety,
    alignItems: "center",
    justifyContent: "center",
  },
});
