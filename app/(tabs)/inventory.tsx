import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export default function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
