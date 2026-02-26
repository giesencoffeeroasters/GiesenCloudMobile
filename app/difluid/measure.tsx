import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useDiFluidStore } from "@/stores/difluidStore";
import { getConnectionInfo, setDebugLogger, enumerateDevice } from "@/services/difluid/bleManager";
import { ConnectionBadge } from "@/components/difluid/ConnectionBadge";
import { CoffeeTypeSelector } from "@/components/difluid/CoffeeTypeSelector";
import { MeasurementCardFromApi } from "@/components/difluid/MeasurementCard";
import { getAllMeasurements } from "@/api/difluid";
import type { DiFluidCoffeeType, DiFluidMeasurementFromApi } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAgtronLabel(agtron: number): string {
  if (agtron < 35) return "Espresso";
  if (agtron < 45) return "French";
  if (agtron < 55) return "Full City";
  if (agtron < 65) return "City";
  if (agtron < 75) return "Dark";
  if (agtron < 85) return "Medium";
  if (agtron < 95) return "Cinnamon";
  return "Light";
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function DiFluidMeasureScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    inventoryId?: string;
    roastId?: string;
    itemName?: string;
  }>();

  const {
    connectionStatus,
    currentMeasurement,
    measurementComplete,
    awaitingWaterActivity,
    measure,
    saveMeasurement,
    clearCurrent,
  } = useDiFluidStore();

  const [coffeeType, setCoffeeType] = useState<DiFluidCoffeeType>(
    params.roastId ? "roasted" : "green"
  );
  const [apiMeasurements, setApiMeasurements] = useState<DiFluidMeasurementFromApi[]>([]);

  const isConnected = connectionStatus === "connected" || connectionStatus === "measuring";
  const isMeasuring = connectionStatus === "measuring";

  // Debug log
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const debugScrollRef = useRef<ScrollView>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setDebugLog((prev) => [...prev, `[${ts}] ${msg}`]);
    setTimeout(() => debugScrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  // Wire BLE debug logger to on-screen log
  useEffect(() => {
    setDebugLogger((msg) => addLog(`[BLE] ${msg}`));
    return () => setDebugLogger(null);
  }, [addLog]);

  // Clear measurement on mount + log connection info + fetch recent
  useEffect(() => {
    clearCurrent();
    addLog("Screen mounted");
    addLog(getConnectionInfo());
    getAllMeasurements().then(setApiMeasurements).catch(() => {});
  }, []);

  const handleMeasure = useCallback(async () => {
    if (!isConnected) {
      addLog("Measure pressed but not connected");
      Alert.alert("Not Connected", "Please connect to a DiFluid device first.", [
        { text: "OK" },
        { text: "Go to Devices", onPress: () => router.push("/difluid") },
      ]);
      return;
    }

    addLog(`Preparing measurement — coffeeType=${coffeeType}`);
    addLog(getConnectionInfo());
    try {
      await measure(coffeeType);
      addLog("Ready — press the button on your DiFluid device");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      addLog(`measure() ERROR: ${msg}`);
    }
  }, [isConnected, coffeeType, measure, addLog]);

  const handleSave = useCallback(async () => {
    const linkedType = params.inventoryId
      ? "inventory"
      : params.roastId
        ? "roast"
        : undefined;
    const linkedId = params.inventoryId
      ? Number(params.inventoryId)
      : params.roastId
        ? Number(params.roastId)
        : undefined;

    try {
      await saveMeasurement(linkedType, linkedId);
      Alert.alert("Saved", "Measurement saved successfully.", [
        {
          text: "OK",
          onPress: () => {
            clearCurrent();
            getAllMeasurements().then(setApiMeasurements).catch(() => {});
          },
        },
      ]);
    } catch {
      Alert.alert("Save Error", "Failed to save measurement. It has been queued for sync.");
    }
  }, [params.inventoryId, params.roastId, saveMeasurement, clearCurrent]);

  // Log measurement data as it arrives
  useEffect(() => {
    if (!currentMeasurement) return;
    const parts: string[] = ["Data received:"];
    if (currentMeasurement.moisture !== undefined) parts.push(`moisture=${currentMeasurement.moisture.toFixed(1)}%`);
    if (currentMeasurement.waterActivity !== undefined) parts.push(`Aw=${currentMeasurement.waterActivity.toFixed(3)}`);
    if (currentMeasurement.density !== undefined) parts.push(`density=${Math.round(currentMeasurement.density)}g/L`);
    if (currentMeasurement.agtronNumber !== undefined) parts.push(`agtron=${currentMeasurement.agtronNumber.toFixed(1)}`);
    if (currentMeasurement.temperature !== undefined) parts.push(`temp=${currentMeasurement.temperature.toFixed(1)}°C`);
    if (currentMeasurement.humidity !== undefined) parts.push(`rh=${currentMeasurement.humidity}%`);
    if (parts.length > 1) addLog(parts.join(" "));
  }, [currentMeasurement]);

  // Log when measurement completes
  useEffect(() => {
    if (measurementComplete) addLog("Measurement COMPLETE");
  }, [measurementComplete]);

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
              <Text style={styles.headerTitle}>Measure</Text>
              <Text style={styles.headerSubtitle}>
                {params.itemName ?? "DiFluid Omix"}
              </Text>
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
        {/* Linked item notice */}
        {params.inventoryId || params.roastId ? (
          <View style={styles.linkedCard}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.sky} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </Svg>
            <Text style={styles.linkedText}>
              Linked to {params.inventoryId ? "inventory" : "roast"} item
              {params.itemName ? `: ${params.itemName}` : ""}
            </Text>
          </View>
        ) : null}

        {/* Coffee Type Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Coffee Type</Text>
          <CoffeeTypeSelector
            selected={coffeeType}
            onSelect={setCoffeeType}
            disabled={isMeasuring}
          />
        </View>

        {/* Measure Button */}
        <TouchableOpacity
          style={[
            styles.bigMeasureButton,
            isMeasuring && styles.bigMeasureButtonMeasuring,
            !isConnected && styles.bigMeasureButtonDisabled,
          ]}
          activeOpacity={0.7}
          onPress={handleMeasure}
          disabled={isMeasuring}
        >
          {isMeasuring ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.bigMeasureText}>
                {awaitingWaterActivity ? "Measuring Water Activity..." : "Waiting for Data..."}
              </Text>
            </>
          ) : (
            <>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="10" />
                <Path d="M12 8v8M8 12h8" />
              </Svg>
              <Text style={styles.bigMeasureText}>
                {isConnected ? "Start Measurement" : "Connect Device First"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Physical button instruction */}
        {isMeasuring ? (
          <View style={styles.deviceHint}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.sky} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 19V5M5 12l7-7 7 7" />
            </Svg>
            <View style={styles.deviceHintContent}>
              <Text style={styles.deviceHintTitle}>Press the button on your DiFluid device</Text>
              <Text style={styles.deviceHintSubtext}>
                Place your sample and press the physical button to start the measurement. Results will appear automatically.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Live Result */}
        {currentMeasurement ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                {measurementComplete ? "Measurement Complete" : "Receiving Data..."}
              </Text>
              {!measurementComplete ? (
                <ActivityIndicator size="small" color={Colors.sky} />
              ) : null}
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {currentMeasurement.moisture !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Moisture</Text>
                  <Text style={styles.resultStatValue}>
                    {currentMeasurement.moisture.toFixed(1)}
                  </Text>
                  <Text style={styles.resultStatUnit}>%</Text>
                </View>
              ) : null}
              {currentMeasurement.waterActivity !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Water Activity</Text>
                  <Text style={styles.resultStatValue}>
                    {currentMeasurement.waterActivity.toFixed(3)}
                  </Text>
                  <Text style={styles.resultStatUnit}>aw</Text>
                </View>
              ) : null}
              {currentMeasurement.density !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Density</Text>
                  <Text style={styles.resultStatValue}>
                    {Math.round(currentMeasurement.density)}
                  </Text>
                  <Text style={styles.resultStatUnit}>g/L</Text>
                </View>
              ) : null}
              {currentMeasurement.agtronNumber !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Agtron</Text>
                  <Text style={styles.resultStatValue}>
                    {currentMeasurement.agtronNumber.toFixed(1)}
                  </Text>
                  <Text style={styles.resultStatUnit}>
                    {getAgtronLabel(currentMeasurement.agtronNumber)}
                  </Text>
                </View>
              ) : null}
              {currentMeasurement.bulkDensity !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Bulk Density</Text>
                  <Text style={styles.resultStatValue}>
                    {Math.round(currentMeasurement.bulkDensity)}
                  </Text>
                  <Text style={styles.resultStatUnit}>g/L</Text>
                </View>
              ) : null}
              {currentMeasurement.weight !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Weight</Text>
                  <Text style={styles.resultStatValue}>
                    {currentMeasurement.weight.toFixed(1)}
                  </Text>
                  <Text style={styles.resultStatUnit}>g</Text>
                </View>
              ) : null}
              {currentMeasurement.screenSizeGrade !== undefined ? (
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>Screen Size</Text>
                  <Text style={styles.resultStatValue}>
                    #{currentMeasurement.screenSizeGrade}
                  </Text>
                  <Text style={styles.resultStatUnit}>
                    {currentMeasurement.screenSizeDiameter !== undefined
                      ? `${currentMeasurement.screenSizeDiameter.toFixed(1)} mm`
                      : ""}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Environment */}
            {(currentMeasurement.temperature !== undefined ||
              currentMeasurement.humidity !== undefined ||
              currentMeasurement.pressure !== undefined ||
              currentMeasurement.altitude !== undefined) ? (
              <View style={styles.envRow}>
                {currentMeasurement.temperature !== undefined ? (
                  <View style={styles.envItem}>
                    <Text style={styles.envLabel}>Temp</Text>
                    <Text style={styles.envValue}>
                      {currentMeasurement.temperature.toFixed(1)}{"\u00B0"}C
                    </Text>
                  </View>
                ) : null}
                {currentMeasurement.humidity !== undefined ? (
                  <View style={styles.envItem}>
                    <Text style={styles.envLabel}>Humidity</Text>
                    <Text style={styles.envValue}>
                      {currentMeasurement.humidity}%
                    </Text>
                  </View>
                ) : null}
                {currentMeasurement.pressure !== undefined ? (
                  <View style={styles.envItem}>
                    <Text style={styles.envLabel}>Pressure</Text>
                    <Text style={styles.envValue}>
                      {currentMeasurement.pressure.toFixed(0)} hPa
                    </Text>
                  </View>
                ) : null}
                {currentMeasurement.altitude !== undefined ? (
                  <View style={styles.envItem}>
                    <Text style={styles.envLabel}>Altitude</Text>
                    <Text style={styles.envValue}>
                      {currentMeasurement.altitude} m
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Save button */}
            {measurementComplete ? (
              <TouchableOpacity
                style={styles.saveButton}
                activeOpacity={0.7}
                onPress={handleSave}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <Path d="M17 21v-8H7v8M7 3v5h8" />
                </Svg>
                <Text style={styles.saveButtonText}>Save & Sync</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Water Activity Notice */}
        {awaitingWaterActivity ? (
          <View style={styles.awNotice}>
            <ActivityIndicator size="small" color={Colors.sky} />
            <View style={styles.awNoticeText}>
              <Text style={styles.awNoticeTitle}>Water Activity Test Running</Text>
              <Text style={styles.awNoticeSubtext}>
                This takes 1-3 minutes. Other measurements will arrive first.
              </Text>
              {currentMeasurement?.mirrorTemperature !== undefined ? (
                <Text style={styles.awNoticeSubtext}>
                  Mirror Temp: {currentMeasurement.mirrorTemperature.toFixed(1)}{"\u00B0"}C
                  {"  |  "}
                  Bean Temp: {currentMeasurement?.beanTemperature?.toFixed(1) ?? "\u2014"}{"\u00B0"}C
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Recent Measurements */}
        {apiMeasurements.length > 0 ? (
          <>
            <Text style={styles.recentTitle}>Recent Measurements</Text>
            {apiMeasurements.slice(0, 5).map((m) => (
              <MeasurementCardFromApi key={m.id} measurement={m} />
            ))}
          </>
        ) : null}

        {/* Debug Log Panel */}
        <TouchableOpacity
          style={styles.debugToggle}
          activeOpacity={0.7}
          onPress={() => setShowDebug((v) => !v)}
        >
          <Text style={styles.debugToggleText}>
            {showDebug ? "Hide Debug Log" : "Show Debug Log"}
          </Text>
          <Text style={styles.debugToggleCount}>{debugLog.length} entries</Text>
        </TouchableOpacity>

        {showDebug ? (
          <View style={styles.debugCard}>
            <View style={styles.debugHeader}>
              <Text style={styles.debugTitle}>BLE Debug Log</Text>
              <View style={styles.debugHeaderActions}>
                <TouchableOpacity onPress={() => {
                  Share.share({ message: debugLog.join("\n") });
                }}>
                  <Text style={styles.debugCopy}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDebugLog([])}>
                  <Text style={styles.debugClear}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              ref={debugScrollRef}
              style={styles.debugScroll}
              nestedScrollEnabled
            >
              {debugLog.length === 0 ? (
                <Text style={styles.debugLine}>No log entries yet.</Text>
              ) : (
                debugLog.map((line, i) => (
                  <Text key={i} style={styles.debugLine} selectable>
                    {line}
                  </Text>
                ))
              )}
            </ScrollView>
            <View style={styles.debugActions}>
              <TouchableOpacity
                style={styles.debugRefreshBtn}
                activeOpacity={0.7}
                onPress={() => addLog(getConnectionInfo())}
              >
                <Text style={styles.debugRefreshText}>Connection Info</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.debugRefreshBtn, { backgroundColor: "#3a2a4e" }]}
                activeOpacity={0.7}
                onPress={async () => {
                  addLog("Enumerating all services/chars…");
                  const result = await enumerateDevice();
                  addLog(result);
                }}
              >
                <Text style={styles.debugRefreshText}>Scan All Services</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
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

  /* Linked item */
  linkedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.skyBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkedText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
    flex: 1,
  },

  /* Section */
  sectionCard: { gap: 8 },
  sectionLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },

  /* Measure button */
  bigMeasureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.slate,
    borderRadius: 12,
    paddingVertical: 18,
  },
  bigMeasureButtonMeasuring: {
    backgroundColor: Colors.boven,
  },
  bigMeasureButtonDisabled: {
    backgroundColor: Colors.slateLight,
    opacity: 0.6,
  },
  bigMeasureText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },

  /* Device hint */
  deviceHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.skyBg,
    borderRadius: 10,
    padding: 16,
  },
  deviceHintContent: { flex: 1, gap: 4 },
  deviceHintTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.sky,
  },
  deviceHintSubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* Result card */
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resultStat: {
    width: "47%",
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 3,
  },
  resultStatLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultStatValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 22,
    color: Colors.text,
  },
  resultStatUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textSecondary,
  },
  envRow: {
    flexDirection: "row",
    gap: 12,
  },
  envItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  envLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  envValue: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.leaf,
    borderRadius: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: "#ffffff",
  },

  /* Water Activity notice */
  awNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.skyBg,
    borderRadius: 10,
    padding: 16,
  },
  awNoticeText: { flex: 1, gap: 2 },
  awNoticeTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.sky,
  },
  awNoticeSubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* Recent */
  recentTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },

  /* Debug Log */
  debugToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
  },
  debugToggleText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  debugToggleCount: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  debugCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a3e",
    padding: 12,
    gap: 8,
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debugHeaderActions: {
    flexDirection: "row",
    gap: 14,
  },
  debugCopy: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: "#7fdbca",
  },
  debugTitle: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 11,
    color: "#7fdbca",
  },
  debugClear: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.traffic,
  },
  debugScroll: {
    maxHeight: 240,
  },
  debugLine: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: "#c3cee3",
    lineHeight: 16,
  },
  debugActions: {
    flexDirection: "row",
    gap: 8,
  },
  debugRefreshBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#2a2a3e",
    borderRadius: 6,
  },
  debugRefreshText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 10,
    color: "#7fdbca",
  },
});
