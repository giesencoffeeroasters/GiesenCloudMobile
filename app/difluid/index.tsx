import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useDiFluidStore } from "@/stores/difluidStore";
import { ConnectionBadge } from "@/components/difluid/ConnectionBadge";
import { DeviceCard } from "@/components/difluid/DeviceCard";
import { getSerialNumber, getFirmwareVersion, getBatteryStatus } from "@/services/difluid/commands";
import { getAllMeasurements } from "@/api/difluid";
import { MeasurementCardFromApi } from "@/components/difluid/MeasurementCard";
import type { DiFluidMeasurementFromApi } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function BluetoothIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" />
    </Svg>
  );
}

function BatteryIcon({ level }: { level?: number }) {
  const color = !level ? Colors.textTertiary : level > 50 ? Colors.leaf : level > 20 ? Colors.sun : Colors.traffic;
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 6H3a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2z" />
      <Path d="M23 13v-2" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function DiFluidDeviceScreen() {
  const insets = useSafeAreaInsets();
  const {
    connectionStatus,
    connectedDevice,
    scanResults,
    scanDiagnostic,
    deviceInfo,
    startScan,
    stopScan,
    connect,
    disconnect,
    autoConnect,
  } = useDiFluidStore();

  const [recentMeasurements, setRecentMeasurements] = useState<DiFluidMeasurementFromApi[]>([]);

  const isScanning = connectionStatus === "scanning";
  const isConnected = connectionStatus === "connected" || connectionStatus === "measuring";
  const isConnecting = connectionStatus === "connecting";

  // Auto-scan and reconnect to last device on mount
  useEffect(() => {
    autoConnect();
  }, []);

  // Fetch device info when connected
  useEffect(() => {
    if (isConnected && !deviceInfo.serialNumber) {
      getSerialNumber().catch(() => {});
      getFirmwareVersion().catch(() => {});
      getBatteryStatus().catch(() => {});
    }
  }, [isConnected, deviceInfo.serialNumber]);

  // Fetch recent measurements from API
  useEffect(() => {
    getAllMeasurements().then(setRecentMeasurements).catch(() => {});
  }, []);

  const handleScan = useCallback(() => {
    if (isScanning) {
      stopScan();
    } else {
      startScan();
    }
  }, [isScanning, startScan, stopScan]);

  const handleConnect = useCallback(
    async (deviceId: string) => {
      try {
        await connect(deviceId);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        Alert.alert("Connection Failed", msg);
      }
    },
    [connect]
  );

  const handleDisconnect = useCallback(async () => {
    Alert.alert("Disconnect", "Disconnect from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => disconnect(),
      },
    ]);
  }, [disconnect]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M12 19l-7-7 7-7"
                  stroke="#fff"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>DiFluid Omix</Text>
              <Text style={styles.headerSubtitle}>Device Management</Text>
            </View>
          </View>
          <ConnectionBadge status={connectionStatus} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connected Device Info */}
        {isConnected && connectedDevice ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <View style={styles.connectedIconBox}>
                <BluetoothIcon color={Colors.leaf} />
              </View>
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedName}>{connectedDevice.name}</Text>
                {deviceInfo.model ? (
                  <Text style={styles.connectedMeta}>
                    {deviceInfo.model}
                    {deviceInfo.firmwareVersion ? ` \u00B7 ${deviceInfo.firmwareVersion}` : ""}
                  </Text>
                ) : null}
                {deviceInfo.serialNumber ? (
                  <Text style={styles.connectedSn}>S/N: {deviceInfo.serialNumber}</Text>
                ) : null}
              </View>
            </View>

            {/* Battery level */}
            {deviceInfo.mainBattery !== undefined ? (
              <View style={styles.batteryRow}>
                <View style={styles.batteryItem}>
                  <BatteryIcon level={deviceInfo.mainBattery} />
                  <Text style={styles.batteryLabel}>Battery</Text>
                  <Text style={styles.batteryValue}>{deviceInfo.mainBattery}%</Text>
                </View>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.connectedActions}>
              <TouchableOpacity
                style={styles.measureButton}
                activeOpacity={0.7}
                onPress={() => router.push("/difluid/measure")}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx="12" cy="12" r="10" />
                  <Path d="M12 8v8M8 12h8" />
                </Svg>
                <Text style={styles.measureButtonText}>Start Measurement</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disconnectButton}
                activeOpacity={0.7}
                onPress={handleDisconnect}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Scan Section */}
        {!isConnected ? (
          <>
            <View style={styles.scanHeader}>
              <Text style={styles.scanTitle}>Nearby Devices</Text>
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanButtonActive]}
                activeOpacity={0.7}
                onPress={handleScan}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <BluetoothIcon color="#ffffff" />
                )}
                <Text style={styles.scanButtonText}>
                  {isScanning ? "Stop Scan" : "Scan"}
                </Text>
              </TouchableOpacity>
            </View>

            {scanResults.length > 0 ? (
              <View style={styles.deviceList}>
                {scanResults.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onConnect={() => handleConnect(device.id)}
                    isConnecting={isConnecting}
                    isConnected={false}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <BluetoothIcon color={Colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isScanning ? "Scanning for devices..." : "No devices found"}
                </Text>
                <Text style={styles.emptySubtext}>
                  {isScanning
                    ? "Make sure your DiFluid Omix is powered on and nearby.\nClose the DiFluid app if it is open."
                    : "Tap Scan to search for nearby DiFluid Omix devices."}
                </Text>
                {scanDiagnostic ? (
                  <View style={styles.diagnosticBox}>
                    <Text style={styles.diagnosticText}>{scanDiagnostic}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </>
        ) : null}

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>How to connect</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Power on your DiFluid Omix device</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Tap "Scan" to discover nearby devices</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Select your device and tap "Connect"</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Start measuring to get instant readings</Text>
          </View>
        </View>

        {/* Recent Measurements */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Measurements</Text>
          {recentMeasurements.length > 0 ? (
            <View style={styles.recentList}>
              {recentMeasurements.slice(0, 5).map((m) => (
                <MeasurementCardFromApi key={m.id} measurement={m} />
              ))}
            </View>
          ) : (
            <View style={styles.recentEmpty}>
              <Text style={styles.recentEmptyText}>No measurements yet</Text>
              <Text style={styles.recentEmptySubtext}>
                Measurements taken with DiFluid will appear here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },

  /* Header */
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
    flex: 1,
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
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },

  /* Content */
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  /* Connected card */
  connectedCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
  },
  connectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  connectedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.leafBg,
    alignItems: "center",
    justifyContent: "center",
  },
  connectedInfo: { flex: 1, gap: 2 },
  connectedName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  connectedMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  connectedSn: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  batteryRow: {
    flexDirection: "row",
    gap: 12,
  },
  batteryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  batteryLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 1,
  },
  batteryValue: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  connectedActions: { gap: 8 },
  measureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingVertical: 14,
  },
  measureButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: "#ffffff",
  },
  disconnectButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  disconnectButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.traffic,
  },

  /* Scan section */
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.sky,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scanButtonActive: {
    backgroundColor: Colors.traffic,
  },
  scanButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: "#ffffff",
  },
  deviceList: { gap: 10 },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: "DMSans-Medium",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  diagnosticBox: {
    marginTop: 8,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 10,
  },
  diagnosticText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: "center",
  },

  /* Recent measurements */
  recentSection: {
    gap: 12,
  },
  recentTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  recentList: {
    gap: 10,
  },
  recentEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  recentEmptyText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  recentEmptySubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
  },

  /* Instruction card */
  instructionCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 12,
  },
  instructionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 12,
    color: "#ffffff",
    backgroundColor: Colors.slate,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    lineHeight: 22,
    overflow: "hidden",
  },
  stepText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
