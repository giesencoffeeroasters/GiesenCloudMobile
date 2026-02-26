import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import type { DiFluidCoffeeType } from "@/types/index";

const OPTIONS: { key: DiFluidCoffeeType; label: string }[] = [
  { key: "green", label: "Green Bean" },
  { key: "roasted", label: "Roasted" },
  { key: "ground", label: "Ground" },
  { key: "auto", label: "Auto" },
];

interface Props {
  selected: DiFluidCoffeeType;
  onSelect: (type: DiFluidCoffeeType) => void;
  disabled?: boolean;
}

export function CoffeeTypeSelector({ selected, onSelect, disabled }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const isActive = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, isActive && styles.optionActive]}
            activeOpacity={disabled ? 1 : 0.7}
            onPress={() => {
              if (!disabled) onSelect(opt.key);
            }}
          >
            <Text
              style={[styles.optionText, isActive && styles.optionTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  optionActive: {
    backgroundColor: Colors.slate,
  },
  optionText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  optionTextActive: {
    color: "#ffffff",
  },
});
