import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import type { DiFluidDevice } from "@/types/index";

interface Props {
  device: DiFluidDevice;
  onConnect: () => void;
  isConnecting: boolean;
  isConnected: boolean;
}

function getSignalStrength(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: "Excellent", color: Colors.leaf };
  if (rssi >= -70) return { label: "Good", color: Colors.leaf };
  if (rssi >= -85) return { label: "Fair", color: Colors.sun };
  return { label: "Weak", color: Colors.traffic };
}

function SignalIcon({ rssi }: { rssi: number }) {
  const { color } = getSignalStrength(rssi);
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <Path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}

export function DeviceCard({ device, onConnect, isConnecting, isConnected }: Props) {
  const signal = getSignalStrength(device.rssi);

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <SignalIcon rssi={device.rssi} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{device.name}</Text>
          <Text style={styles.meta}>
            {signal.label} signal ({device.rssi} dBm)
          </Text>
        </View>
      </View>
      {isConnected ? (
        <View style={styles.connectedBadge}>
          <Text style={styles.connectedText}>Connected</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.connectButton}
          onPress={onConnect}
          activeOpacity={0.7}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.connectText}>Connect</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  meta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  connectButton: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: "center",
  },
  connectText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: "#ffffff",
  },
  connectedBadge: {
    backgroundColor: Colors.leafBg,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectedText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
    color: Colors.leaf,
  },
});
