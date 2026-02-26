import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import type { DiFluidMeasurement, DiFluidMeasurementFromApi } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Roast Label                                                        */
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

function getRoastStandardLabel(standard: number): string {
  return standard === 1 ? "SCAA" : "Common";
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

const PIE_LABELS = [
  "Very Dark",
  "Dark",
  "Mod. Dark",
  "Medium",
  "Mod. Light",
  "Light",
  "Very Light",
  "Ext. Light",
];

function barColor(index: number): string {
  // Gradient from dark brown (index 0) to light tan (index 30)
  const t = index / 30;
  const r = Math.round(40 + t * 195);
  const g = Math.round(25 + t * 175);
  const b = Math.round(15 + t * 140);
  return `rgb(${r},${g},${b})`;
}

/* ------------------------------------------------------------------ */
/*  Stat Cell                                                          */
/* ------------------------------------------------------------------ */

function StatCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Environment Icons                                                  */
/* ------------------------------------------------------------------ */

function ThermometerIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.textTertiary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
    </Svg>
  );
}

function DropletIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.textTertiary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    </Svg>
  );
}

function GaugeIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.textTertiary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
      <Path d="M12 6v6l4 2" />
    </Svg>
  );
}

function MountainIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.textTertiary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 3l4 8 5-5 5 15H2L8 3z" />
    </Svg>
  );
}

const ENV_ICONS: Record<string, React.ReactNode> = {
  Temperature: <ThermometerIcon />,
  Humidity: <DropletIcon />,
  Pressure: <GaugeIcon />,
  Altitude: <MountainIcon />,
};

/* ------------------------------------------------------------------ */
/*  Detail Row                                                         */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      {icon ? <View style={styles.detailIcon}>{icon}</View> : null}
      <Text style={[styles.detailLabel, icon ? { flex: 1 } : undefined]}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar Chart (31 bins)                                                */
/* ------------------------------------------------------------------ */

function BarChart31({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.barChartContainer}>
      <Text style={styles.detailSectionTitle}>Color Distribution</Text>
      <View style={styles.barChartRow}>
        {data.map((val, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(2, (val / max) * 40),
                backgroundColor: barColor(i),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Pie Segments (8 bins)                                              */
/* ------------------------------------------------------------------ */

function PieSegments({ data }: { data: number[] }) {
  const total = data.reduce((a, b) => a + b, 0) || 1;
  return (
    <View style={styles.pieContainer}>
      <Text style={styles.detailSectionTitle}>Color Segments</Text>
      <View style={styles.pieGrid}>
        {data.map((val, i) => {
          const pct = ((val / total) * 100).toFixed(0);
          return (
            <View key={i} style={styles.pieCell}>
              <View style={[styles.pieColorDot, { backgroundColor: barColor(i * 4) }]} />
              <Text style={styles.pieLabelText} numberOfLines={1}>
                {PIE_LABELS[i] ?? `#${i + 1}`}
              </Text>
              <Text style={styles.pieValue}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Expandable Detail (API measurement)                                */
/* ------------------------------------------------------------------ */

function ExpandedDetailFromApi({
  measurement,
}: {
  measurement: DiFluidMeasurementFromApi;
}) {
  const hasBulk =
    measurement.bulk_density !== null || measurement.weight !== null;
  const hasScreenSize =
    measurement.screen_size_grade !== null ||
    measurement.screen_size_diameter !== null;
  const hasWaTemps =
    measurement.mirror_temperature !== null ||
    measurement.bean_temperature !== null;
  const hasColorAnalysis =
    measurement.variance !== null || measurement.roast_standard !== null;
  const hasEnv =
    measurement.temperature !== null ||
    measurement.humidity !== null ||
    measurement.pressure !== null ||
    measurement.altitude !== null;

  return (
    <View style={styles.detailSection}>
      {/* Physical Properties */}
      {(hasBulk || hasScreenSize) ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Physical Properties</Text>
          {measurement.bulk_density !== null ? (
            <DetailRow label="Bulk Density" value={`${Number(measurement.bulk_density).toFixed(1)} g/L`} />
          ) : null}
          {measurement.weight !== null ? (
            <DetailRow label="Weight" value={`${Number(measurement.weight).toFixed(1)} g`} />
          ) : null}
          {measurement.screen_size_grade !== null ? (
            <DetailRow
              label="Screen Size"
              value={
                measurement.screen_size_diameter !== null
                  ? `#${measurement.screen_size_grade} (${Number(measurement.screen_size_diameter).toFixed(1)} mm)`
                  : `#${measurement.screen_size_grade}`
              }
            />
          ) : null}
        </View>
      ) : null}

      {/* Water Activity Temps */}
      {hasWaTemps ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Water Activity Details</Text>
          {measurement.mirror_temperature !== null ? (
            <DetailRow label="Mirror Temp" value={`${Number(measurement.mirror_temperature).toFixed(1)}\u00B0C`} />
          ) : null}
          {measurement.bean_temperature !== null ? (
            <DetailRow label="Bean Temp" value={`${Number(measurement.bean_temperature).toFixed(1)}\u00B0C`} />
          ) : null}
        </View>
      ) : null}

      {/* Color Analysis */}
      {hasColorAnalysis ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Color Analysis</Text>
          {measurement.agtron_number !== null ? (
            <DetailRow label="Agtron Mean" value={Number(measurement.agtron_number).toFixed(1)} />
          ) : null}
          {measurement.variance !== null ? (
            <DetailRow label="Variance" value={Number(measurement.variance).toFixed(2)} />
          ) : null}
          {measurement.roast_standard !== null ? (
            <DetailRow label="Standard" value={getRoastStandardLabel(measurement.roast_standard)} />
          ) : null}
        </View>
      ) : null}

      {measurement.bar_chart_31 !== null && measurement.bar_chart_31.length > 0 ? (
        <BarChart31 data={measurement.bar_chart_31} />
      ) : null}

      {measurement.pie_chart_8 !== null && measurement.pie_chart_8.length > 0 ? (
        <PieSegments data={measurement.pie_chart_8} />
      ) : null}

      {/* Environment */}
      {hasEnv ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Environment</Text>
          {measurement.temperature !== null ? (
            <DetailRow label="Temperature" value={`${Number(measurement.temperature).toFixed(1)}\u00B0C`} icon={ENV_ICONS.Temperature} />
          ) : null}
          {measurement.humidity !== null ? (
            <DetailRow label="Humidity" value={`${Number(measurement.humidity).toFixed(0)}% RH`} icon={ENV_ICONS.Humidity} />
          ) : null}
          {measurement.pressure !== null ? (
            <DetailRow label="Pressure" value={`${Number(measurement.pressure).toFixed(0)} hPa`} icon={ENV_ICONS.Pressure} />
          ) : null}
          {measurement.altitude !== null ? (
            <DetailRow label="Altitude" value={`${measurement.altitude} m`} icon={ENV_ICONS.Altitude} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Expandable Detail (local measurement)                              */
/* ------------------------------------------------------------------ */

function ExpandedDetailLocal({
  measurement,
}: {
  measurement: DiFluidMeasurement;
}) {
  const hasBulk =
    measurement.bulkDensity !== undefined || measurement.weight !== undefined;
  const hasScreenSize =
    measurement.screenSizeGrade !== undefined ||
    measurement.screenSizeDiameter !== undefined;
  const hasWaTemps =
    measurement.mirrorTemperature !== undefined ||
    measurement.beanTemperature !== undefined;
  const hasColorAnalysis =
    measurement.variance !== undefined || measurement.roastStandard !== undefined;
  const hasEnv =
    measurement.temperature !== undefined ||
    measurement.humidity !== undefined ||
    measurement.pressure !== undefined ||
    measurement.altitude !== undefined;

  return (
    <View style={styles.detailSection}>
      {(hasBulk || hasScreenSize) ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Physical Properties</Text>
          {measurement.bulkDensity !== undefined ? (
            <DetailRow label="Bulk Density" value={`${measurement.bulkDensity.toFixed(1)} g/L`} />
          ) : null}
          {measurement.weight !== undefined ? (
            <DetailRow label="Weight" value={`${measurement.weight.toFixed(1)} g`} />
          ) : null}
          {measurement.screenSizeGrade !== undefined ? (
            <DetailRow
              label="Screen Size"
              value={
                measurement.screenSizeDiameter !== undefined
                  ? `#${measurement.screenSizeGrade} (${measurement.screenSizeDiameter.toFixed(1)} mm)`
                  : `#${measurement.screenSizeGrade}`
              }
            />
          ) : null}
        </View>
      ) : null}

      {hasWaTemps ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Water Activity Details</Text>
          {measurement.mirrorTemperature !== undefined ? (
            <DetailRow label="Mirror Temp" value={`${measurement.mirrorTemperature.toFixed(1)}\u00B0C`} />
          ) : null}
          {measurement.beanTemperature !== undefined ? (
            <DetailRow label="Bean Temp" value={`${measurement.beanTemperature.toFixed(1)}\u00B0C`} />
          ) : null}
        </View>
      ) : null}

      {hasColorAnalysis ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Color Analysis</Text>
          {measurement.agtronNumber !== undefined ? (
            <DetailRow label="Agtron Mean" value={measurement.agtronNumber.toFixed(1)} />
          ) : null}
          {measurement.variance !== undefined ? (
            <DetailRow label="Variance" value={measurement.variance.toFixed(2)} />
          ) : null}
          {measurement.roastStandard !== undefined ? (
            <DetailRow label="Standard" value={getRoastStandardLabel(measurement.roastStandard)} />
          ) : null}
        </View>
      ) : null}

      {measurement.barChart31 !== undefined && measurement.barChart31.length > 0 ? (
        <BarChart31 data={measurement.barChart31} />
      ) : null}

      {measurement.pieChart8 !== undefined && measurement.pieChart8.length > 0 ? (
        <PieSegments data={measurement.pieChart8} />
      ) : null}

      {hasEnv ? (
        <View style={styles.detailGroup}>
          <Text style={styles.detailSectionTitle}>Environment</Text>
          {measurement.temperature !== undefined ? (
            <DetailRow label="Temperature" value={`${measurement.temperature.toFixed(1)}\u00B0C`} icon={ENV_ICONS.Temperature} />
          ) : null}
          {measurement.humidity !== undefined ? (
            <DetailRow label="Humidity" value={`${measurement.humidity.toFixed(0)}% RH`} icon={ENV_ICONS.Humidity} />
          ) : null}
          {measurement.pressure !== undefined ? (
            <DetailRow label="Pressure" value={`${measurement.pressure.toFixed(0)} hPa`} icon={ENV_ICONS.Pressure} />
          ) : null}
          {measurement.altitude !== undefined ? (
            <DetailRow label="Altitude" value={`${measurement.altitude} m`} icon={ENV_ICONS.Altitude} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  MeasurementCard (local measurement)                                */
/* ------------------------------------------------------------------ */

interface Props {
  measurement: DiFluidMeasurement;
  compact?: boolean;
}

export function MeasurementCard({ measurement, compact }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    measurement.bulkDensity !== undefined ||
    measurement.weight !== undefined ||
    measurement.screenSizeGrade !== undefined ||
    measurement.mirrorTemperature !== undefined ||
    measurement.variance !== undefined ||
    measurement.barChart31 !== undefined ||
    measurement.pressure !== undefined;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.coffeeBadge}>
          <Text style={styles.coffeeBadgeText}>
            {measurement.coffeeType.charAt(0).toUpperCase() +
              measurement.coffeeType.slice(1)}
          </Text>
        </View>
        {measurement.syncedAt ? (
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>Synced</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text style={styles.timestamp}>
          {new Date(measurement.measuredAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </Text>
      </View>

      {/* Primary stats */}
      <View style={styles.statsRow}>
        {measurement.moisture !== undefined ? (
          <StatCell
            label="Moisture"
            value={measurement.moisture.toFixed(1)}
            unit="%"
          />
        ) : null}
        {measurement.waterActivity !== undefined ? (
          <StatCell
            label="Water Activity"
            value={measurement.waterActivity.toFixed(3)}
            unit="aw"
          />
        ) : null}
        {measurement.density !== undefined ? (
          <StatCell
            label="Density"
            value={Math.round(measurement.density).toString()}
            unit="g/L"
          />
        ) : null}
      </View>

      {/* Secondary stats */}
      {(measurement.agtronNumber !== undefined ||
        measurement.screenSizeGrade !== undefined) &&
      !compact ? (
        <View style={styles.statsRow}>
          {measurement.agtronNumber !== undefined ? (
            <StatCell
              label="Agtron"
              value={measurement.agtronNumber.toFixed(1)}
              unit={getAgtronLabel(measurement.agtronNumber)}
            />
          ) : null}
          {measurement.screenSizeGrade !== undefined ? (
            <StatCell
              label="Screen Size"
              value={`#${measurement.screenSizeGrade}`}
              unit={
                measurement.screenSizeDiameter !== undefined
                  ? `${measurement.screenSizeDiameter.toFixed(1)} mm`
                  : ""
              }
            />
          ) : null}
        </View>
      ) : null}

      {/* View Details toggle */}
      {hasDetails && !compact ? (
        <TouchableOpacity
          style={styles.detailToggle}
          activeOpacity={0.7}
          onPress={() => setExpanded((v) => !v)}
        >
          <Text style={styles.detailToggleText}>
            {expanded ? "Hide Details" : "View Details"}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Expanded detail */}
      {expanded ? <ExpandedDetailLocal measurement={measurement} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  MeasurementCardFromApi (for inventory/roast detail)                */
/* ------------------------------------------------------------------ */

export function MeasurementCardFromApi({
  measurement,
  onLinkPress,
}: {
  measurement: DiFluidMeasurementFromApi;
  onLinkPress?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    measurement.bulk_density !== null ||
    measurement.weight !== null ||
    measurement.screen_size_grade !== null ||
    measurement.mirror_temperature !== null ||
    measurement.variance !== null ||
    measurement.bar_chart_31 !== null ||
    measurement.pressure !== null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.coffeeBadge}>
          <Text style={styles.coffeeBadgeText}>
            {measurement.coffee_type.charAt(0).toUpperCase() +
              measurement.coffee_type.slice(1)}
          </Text>
        </View>
        {measurement.measurable_type_short ? (
          <View style={styles.linkedBadge}>
            <Text style={styles.linkedBadgeText}>
              {measurement.measurable_type_short === "inventory" ? "Inventory" : "Roast"}
            </Text>
          </View>
        ) : (
          <View style={styles.unlinkedBadge}>
            <Text style={styles.unlinkedBadgeText}>Unlinked</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text style={styles.timestamp}>
          {new Date(measurement.measured_at).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </Text>
      </View>

      {/* Primary stats */}
      <View style={styles.statsRow}>
        {measurement.moisture !== null ? (
          <StatCell
            label="Moisture"
            value={Number(measurement.moisture).toFixed(1)}
            unit="%"
          />
        ) : null}
        {measurement.water_activity !== null ? (
          <StatCell
            label="Water Activity"
            value={Number(measurement.water_activity).toFixed(3)}
            unit="aw"
          />
        ) : null}
        {measurement.density !== null ? (
          <StatCell
            label="Density"
            value={Math.round(Number(measurement.density)).toString()}
            unit="g/L"
          />
        ) : null}
      </View>

      {/* Secondary stats */}
      {measurement.agtron_number !== null ||
      measurement.screen_size_grade !== null ? (
        <View style={styles.statsRow}>
          {measurement.agtron_number !== null ? (
            <StatCell
              label="Agtron"
              value={Number(measurement.agtron_number).toFixed(1)}
              unit={getAgtronLabel(Number(measurement.agtron_number))}
            />
          ) : null}
          {measurement.screen_size_grade !== null ? (
            <StatCell
              label="Screen Size"
              value={`#${measurement.screen_size_grade}`}
              unit={
                measurement.screen_size_diameter !== null
                  ? `${Number(measurement.screen_size_diameter).toFixed(1)} mm`
                  : ""
              }
            />
          ) : null}
        </View>
      ) : null}

      {/* Link button for unlinked measurements */}
      {onLinkPress ? (
        <TouchableOpacity
          style={styles.linkButton}
          activeOpacity={0.7}
          onPress={onLinkPress}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.sky} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </Svg>
          <Text style={styles.linkButtonText}>Link to...</Text>
        </TouchableOpacity>
      ) : null}

      {/* View Details toggle */}
      {hasDetails ? (
        <TouchableOpacity
          style={styles.detailToggle}
          activeOpacity={0.7}
          onPress={() => setExpanded((v) => !v)}
        >
          <Text style={styles.detailToggleText}>
            {expanded ? "Hide Details" : "View Details"}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Expanded detail */}
      {expanded ? <ExpandedDetailFromApi measurement={measurement} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coffeeBadge: {
    backgroundColor: Colors.skyBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coffeeBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.sky,
  },
  syncBadge: {
    backgroundColor: Colors.leafBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.leaf,
  },
  pendingBadge: {
    backgroundColor: Colors.sunBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.sun,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 3,
  },
  statLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 18,
    color: Colors.text,
  },
  statUnit: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 9,
    color: Colors.textSecondary,
  },
  timestamp: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },

  /* Detail toggle */
  detailToggle: {
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  detailToggleText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.sky,
  },

  /* Detail section */
  detailSection: {
    gap: 14,
  },
  detailGroup: {
    gap: 6,
  },
  detailSectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.bg,
    borderRadius: 6,
  },
  detailIcon: {
    marginRight: 6,
  },
  detailLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.text,
  },

  /* Bar chart */
  barChartContainer: {
    gap: 6,
  },
  barChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
    height: 44,
    backgroundColor: Colors.bg,
    borderRadius: 6,
    padding: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 2,
  },

  /* Pie segments */
  pieContainer: {
    gap: 6,
  },
  pieGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pieCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "47%",
    backgroundColor: Colors.bg,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  pieColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pieLabelText: {
    fontFamily: "DMSans-Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    flex: 1,
  },
  pieValue: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 10,
    color: Colors.text,
  },

  /* Link button */
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.skyBg,
    borderRadius: 8,
    paddingVertical: 10,
  },
  linkButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.sky,
  },

  /* Linked/Unlinked badges */
  linkedBadge: {
    backgroundColor: Colors.leafBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkedBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.leaf,
  },
  unlinkedBadge: {
    backgroundColor: Colors.sunBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unlinkedBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.sun,
  },

  /* Legacy — kept for backwards compat if used elsewhere */
  envRow: {
    flexDirection: "row",
    gap: 16,
  },
  envText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
