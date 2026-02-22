import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import Svg, {
  Path,
  Line,
  Text as SvgText,
  G,
  Rect,
  Defs,
  ClipPath,
} from "react-native-svg";
import { Colors } from "@/constants/colors";
import type { ExtendedCurveData, RoastEvent, RoastPhase, CurvePoint } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const CHART_COLORS = {
  beanTemp: Colors.sky,
  drumTemp: Colors.boven,
  ror: Colors.grape,
  power: Colors.leaf,
  drumSpeed: Colors.sun,
  pressure: Colors.traffic,
};

const EVENT_LABELS: Record<string, string> = {
  FIRST_CRACK: "FC",
  SECOND_CRACK: "SC",
  CHARGE: "CH",
  DROP: "DR",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTimeAxis(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface RoastCurveChartProps {
  curveData: ExtendedCurveData;
  duration: number;
  events?: RoastEvent[];
  phases?: RoastPhase[];
  clipId?: string;
}

/* ------------------------------------------------------------------ */
/*  Mini Chart for secondary curves                                     */
/* ------------------------------------------------------------------ */

interface MiniChartProps {
  points: CurvePoint[];
  color: string;
  label: string;
  chartWidth: number;
  timeMax: number;
  paddingLeft: number;
  plotWidth: number;
  clipId: string;
}

function MiniChart({
  points,
  color,
  label,
  chartWidth,
  timeMax,
  paddingLeft,
  plotWidth,
  clipId,
}: MiniChartProps) {
  const height = 80;
  const padTop = 8;
  const padBottom = 4;
  const plotH = height - padTop - padBottom;

  const { minVal, maxVal } = useMemo(() => {
    const values = points.map((p) => p.value).filter((v) => !isNaN(v));
    if (values.length === 0) return { minVal: 0, maxVal: 100 };
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    return { minVal: mn, maxVal: mx === mn ? mn + 1 : mx };
  }, [points]);

  const mapX = useCallback(
    (time: number) => paddingLeft + (time / timeMax) * plotWidth,
    [timeMax, plotWidth, paddingLeft]
  );

  const mapY = useCallback(
    (value: number) => {
      const range = maxVal - minVal || 1;
      return padTop + plotH - ((value - minVal) / range) * plotH;
    },
    [minVal, maxVal, plotH]
  );

  const path = useMemo(() => {
    const filtered = points.filter((p) => !isNaN(p.value));
    if (filtered.length < 2) return "";
    let d = `M ${mapX(filtered[0].time)} ${mapY(filtered[0].value)}`;
    for (let i = 1; i < filtered.length; i++) {
      const x0 = mapX(filtered[i - 1].time);
      const y0 = mapY(filtered[i - 1].value);
      const x1 = mapX(filtered[i].time);
      const y1 = mapY(filtered[i].value);
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }, [points, mapX, mapY]);

  if (!path) return null;

  return (
    <View style={miniStyles.container}>
      <View style={miniStyles.labelRow}>
        <View style={[miniStyles.dot, { backgroundColor: color }]} />
        <Text style={miniStyles.label}>{label}</Text>
        <Text style={miniStyles.range}>
          {Math.round(minVal)} - {Math.round(maxVal)}
        </Text>
      </View>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={paddingLeft} y={padTop} width={plotWidth} height={plotH} />
          </ClipPath>
        </Defs>
        <Rect
          x={paddingLeft}
          y={padTop}
          width={plotWidth}
          height={plotH}
          fill="#fafaf8"
          rx={3}
        />
        <Line
          x1={paddingLeft}
          y1={padTop + plotH}
          x2={paddingLeft + plotWidth}
          y2={padTop + plotH}
          stroke={Colors.border}
          strokeWidth={0.5}
        />
        <G clipPath={`url(#${clipId})`}>
          <Path
            d={path}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: { gap: 4 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  range: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 9,
    color: Colors.textTertiary,
  },
});

/* ------------------------------------------------------------------ */
/*  Main Chart Component                                                */
/* ------------------------------------------------------------------ */

export function RoastCurveChart({
  curveData,
  duration,
  events = [],
  phases = [],
  clipId = "curve-clip",
}: RoastCurveChartProps) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 40;
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 32;
  const rorAxisWidth = 36;

  const plotWidth = chartWidth - paddingLeft - paddingRight - rorAxisWidth;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  // Secondary curve toggles
  const [showPower, setShowPower] = useState(false);
  const [showDrumSpeed, setShowDrumSpeed] = useState(false);
  const [showPressure, setShowPressure] = useState(false);

  const hasPower = (curveData.power?.length ?? 0) > 1;
  const hasDrumSpeed = (curveData.drum_speed?.length ?? 0) > 1;
  const hasPressure = (curveData.pressure?.length ?? 0) > 1;
  const hasSecondary = hasPower || hasDrumSpeed || hasPressure;

  const { beanTemp, drumTemp, ror } = useMemo(
    () => ({
      beanTemp: curveData.bean_temp ?? [],
      drumTemp: curveData.drum_temp ?? [],
      ror: curveData.ror ?? [],
    }),
    [curveData]
  );

  const { tempMin, tempMax, rorMin, rorMax, timeMax } = useMemo(() => {
    const allTempValues = [
      ...beanTemp.map((p) => p.value),
      ...drumTemp.map((p) => p.value),
    ].filter((v) => v !== undefined && v !== null && !isNaN(v));

    const allRorValues = ror
      .map((p) => p.value)
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    const allTimes = [
      ...beanTemp.map((p) => p.time),
      ...drumTemp.map((p) => p.time),
      ...ror.map((p) => p.time),
    ];

    const tMin = allTempValues.length > 0 ? Math.min(...allTempValues) : 0;
    const tMax = allTempValues.length > 0 ? Math.max(...allTempValues) : 250;
    const rMin = allRorValues.length > 0 ? Math.min(...allRorValues) : 0;
    const rMax = allRorValues.length > 0 ? Math.max(...allRorValues) : 30;
    const maxDataTime = allTimes.length > 0 ? Math.max(...allTimes) : 0;

    const rawRange = tMax - tMin || 1;
    let tempStep = 50;
    if (rawRange < 60) tempStep = 10;
    else if (rawRange < 120) tempStep = 25;

    const tMinAligned = Math.max(0, Math.floor(tMin / tempStep) * tempStep);
    const tMaxAligned = Math.ceil(tMax / tempStep) * tempStep;
    const rawTimeMax = Math.max(maxDataTime, duration ?? 600);
    const timeMaxAligned = Math.ceil(rawTimeMax / 60) * 60;

    return {
      tempMin: tMinAligned,
      tempMax: tMaxAligned,
      rorMin: Math.max(0, Math.floor(rMin / 5) * 5),
      rorMax: Math.ceil(rMax / 5) * 5,
      timeMax: timeMaxAligned,
    };
  }, [beanTemp, drumTemp, ror, duration]);

  const mapX = useCallback(
    (time: number) => paddingLeft + (time / timeMax) * plotWidth,
    [timeMax, plotWidth]
  );

  const mapTempY = useCallback(
    (value: number) => {
      const range = tempMax - tempMin || 1;
      return paddingTop + plotHeight - ((value - tempMin) / range) * plotHeight;
    },
    [tempMin, tempMax, plotHeight]
  );

  const mapRorY = useCallback(
    (value: number) => {
      const range = rorMax - rorMin || 1;
      return paddingTop + plotHeight - ((value - rorMin) / range) * plotHeight;
    },
    [rorMin, rorMax, plotHeight]
  );

  const buildSmoothPath = useCallback(
    (points: CurvePoint[], mapY: (value: number) => number): string => {
      const filtered = points.filter(
        (p) => p.value !== undefined && p.value !== null && !isNaN(p.value)
      );
      if (filtered.length < 2) return "";

      let d = `M ${mapX(filtered[0].time)} ${mapY(filtered[0].value)}`;
      for (let i = 1; i < filtered.length; i++) {
        const x0 = mapX(filtered[i - 1].time);
        const y0 = mapY(filtered[i - 1].value);
        const x1 = mapX(filtered[i].time);
        const y1 = mapY(filtered[i].value);
        const cx = (x0 + x1) / 2;
        d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
      }
      return d;
    },
    [mapX]
  );

  const tempGridLines = useMemo(() => {
    const lines: number[] = [];
    const range = tempMax - tempMin;
    let step = 50;
    if (range < 60) step = 10;
    else if (range < 120) step = 25;
    for (let v = tempMin; v <= tempMax; v += step) lines.push(v);
    return lines;
  }, [tempMin, tempMax]);

  const timeGridLines = useMemo(() => {
    const lines: number[] = [];
    let step = 60;
    if (timeMax > 600) step = 120;
    if (timeMax > 1200) step = 300;
    for (let t = 0; t <= timeMax; t += step) lines.push(t);
    return lines;
  }, [timeMax]);

  const beanTempPath = buildSmoothPath(beanTemp, mapTempY);
  const drumTempPath = buildSmoothPath(drumTemp, mapTempY);
  const rorPath = buildSmoothPath(ror, mapRorY);

  return (
    <View style={chartStyles.container}>
      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: CHART_COLORS.beanTemp }]} />
          <Text style={chartStyles.legendText}>Bean Temp</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: CHART_COLORS.drumTemp }]} />
          <Text style={chartStyles.legendText}>Drum Temp</Text>
        </View>
        {ror.length > 0 ? (
          <View style={chartStyles.legendItem}>
            <View style={[chartStyles.legendDot, { backgroundColor: CHART_COLORS.ror }]} />
            <Text style={chartStyles.legendText}>RoR</Text>
          </View>
        ) : null}
      </View>

      {/* SVG Chart */}
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={paddingLeft} y={paddingTop} width={plotWidth} height={plotHeight} />
          </ClipPath>
        </Defs>

        {/* Background */}
        <Rect
          x={paddingLeft}
          y={paddingTop}
          width={plotWidth}
          height={plotHeight}
          fill="#fafaf8"
          rx={4}
        />

        {/* Phase background bands */}
        <G clipPath={`url(#${clipId})`}>
          {phases.map((phase, i) => {
            const x1 = mapX(phase.start_time);
            const x2 = mapX(phase.end_time);
            return (
              <Rect
                key={`phase-${i}`}
                x={x1}
                y={paddingTop}
                width={Math.max(0, x2 - x1)}
                height={plotHeight}
                fill={phase.color || "#E8E8E3"}
                opacity={0.15}
              />
            );
          })}
        </G>

        {/* Horizontal gridlines */}
        {tempGridLines.map((val) => (
          <G key={`hgrid-${val}`}>
            <Line
              x1={paddingLeft}
              y1={mapTempY(val)}
              x2={paddingLeft + plotWidth}
              y2={mapTempY(val)}
              stroke={Colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 3"
            />
            <SvgText
              x={paddingLeft - 6}
              y={mapTempY(val) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={Colors.textTertiary}
              textAnchor="end"
            >
              {String(val)}
            </SvgText>
          </G>
        ))}

        {/* Vertical gridlines */}
        {timeGridLines.map((val) => (
          <G key={`vgrid-${val}`}>
            <Line
              x1={mapX(val)}
              y1={paddingTop}
              x2={mapX(val)}
              y2={paddingTop + plotHeight}
              stroke={Colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 3"
            />
            <SvgText
              x={mapX(val)}
              y={paddingTop + plotHeight + 14}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={Colors.textTertiary}
              textAnchor="middle"
            >
              {formatTimeAxis(val)}
            </SvgText>
          </G>
        ))}

        {/* RoR axis labels */}
        {ror.length > 0 ? (
          <G>
            <SvgText
              x={paddingLeft + plotWidth + 6}
              y={mapRorY(rorMax) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={CHART_COLORS.ror}
              textAnchor="start"
            >
              {String(Math.round(rorMax))}
            </SvgText>
            <SvgText
              x={paddingLeft + plotWidth + 6}
              y={mapRorY(rorMin) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={CHART_COLORS.ror}
              textAnchor="start"
            >
              {String(Math.round(rorMin))}
            </SvgText>
            <SvgText
              x={paddingLeft + plotWidth + 6}
              y={mapRorY((rorMax + rorMin) / 2) + 4}
              fontSize={9}
              fontFamily="JetBrainsMono-Regular"
              fill={CHART_COLORS.ror}
              textAnchor="start"
            >
              {String(Math.round((rorMax + rorMin) / 2))}
            </SvgText>
          </G>
        ) : null}

        {/* Plot border */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={paddingLeft + plotWidth}
          y2={paddingTop + plotHeight}
          stroke={Colors.border}
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + plotHeight}
          stroke={Colors.border}
          strokeWidth={1}
        />

        {/* Curve lines */}
        <G clipPath={`url(#${clipId})`}>
          {rorPath.length > 0 ? (
            <Path
              d={rorPath}
              stroke={CHART_COLORS.ror}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
          ) : null}
          {drumTempPath.length > 0 ? (
            <Path
              d={drumTempPath}
              stroke={CHART_COLORS.drumTemp}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
          {beanTempPath.length > 0 ? (
            <Path
              d={beanTempPath}
              stroke={CHART_COLORS.beanTemp}
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
        </G>

        {/* Event marker lines */}
        {events.map((event, i) => {
          const label = EVENT_LABELS[event.type];
          if (!label) return null;
          const x = mapX(event.timePassed);
          if (x < paddingLeft || x > paddingLeft + plotWidth) return null;
          return (
            <G key={`event-${i}`}>
              <Line
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + plotHeight}
                stroke={Colors.slate}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <Rect
                x={x - 10}
                y={paddingTop - 1}
                width={20}
                height={12}
                fill={Colors.slate}
                rx={3}
                opacity={0.8}
              />
              <SvgText
                x={x}
                y={paddingTop + 8}
                fontSize={7}
                fontFamily="JetBrainsMono-Bold"
                fill="#ffffff"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Secondary curve toggle buttons */}
      {hasSecondary ? (
        <View style={chartStyles.toggleRow}>
          {hasPower ? (
            <TouchableOpacity
              style={[
                chartStyles.toggleButton,
                showPower && { backgroundColor: Colors.leafBg, borderColor: Colors.leaf },
              ]}
              onPress={() => setShowPower(!showPower)}
              activeOpacity={0.7}
            >
              <View style={[chartStyles.toggleDot, { backgroundColor: CHART_COLORS.power }]} />
              <Text
                style={[
                  chartStyles.toggleText,
                  showPower && { color: Colors.leaf },
                ]}
              >
                Power
              </Text>
            </TouchableOpacity>
          ) : null}
          {hasDrumSpeed ? (
            <TouchableOpacity
              style={[
                chartStyles.toggleButton,
                showDrumSpeed && { backgroundColor: Colors.sunBg, borderColor: Colors.sun },
              ]}
              onPress={() => setShowDrumSpeed(!showDrumSpeed)}
              activeOpacity={0.7}
            >
              <View style={[chartStyles.toggleDot, { backgroundColor: CHART_COLORS.drumSpeed }]} />
              <Text
                style={[
                  chartStyles.toggleText,
                  showDrumSpeed && { color: Colors.sun },
                ]}
              >
                Drum Speed
              </Text>
            </TouchableOpacity>
          ) : null}
          {hasPressure ? (
            <TouchableOpacity
              style={[
                chartStyles.toggleButton,
                showPressure && { backgroundColor: Colors.trafficBg, borderColor: Colors.traffic },
              ]}
              onPress={() => setShowPressure(!showPressure)}
              activeOpacity={0.7}
            >
              <View style={[chartStyles.toggleDot, { backgroundColor: CHART_COLORS.pressure }]} />
              <Text
                style={[
                  chartStyles.toggleText,
                  showPressure && { color: Colors.traffic },
                ]}
              >
                Pressure
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Secondary mini charts */}
      {showPower && hasPower ? (
        <MiniChart
          points={curveData.power}
          color={CHART_COLORS.power}
          label="Power"
          chartWidth={chartWidth}
          timeMax={timeMax}
          paddingLeft={paddingLeft}
          plotWidth={plotWidth}
          clipId={`${clipId}-power`}
        />
      ) : null}
      {showDrumSpeed && hasDrumSpeed ? (
        <MiniChart
          points={curveData.drum_speed}
          color={CHART_COLORS.drumSpeed}
          label="Drum Speed"
          chartWidth={chartWidth}
          timeMax={timeMax}
          paddingLeft={paddingLeft}
          plotWidth={plotWidth}
          clipId={`${clipId}-speed`}
        />
      ) : null}
      {showPressure && hasPressure ? (
        <MiniChart
          points={curveData.pressure}
          color={CHART_COLORS.pressure}
          label="Pressure"
          chartWidth={chartWidth}
          timeMax={timeMax}
          paddingLeft={paddingLeft}
          plotWidth={plotWidth}
          clipId={`${clipId}-press`}
        />
      ) : null}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { gap: 8 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: "DMSans-Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  toggleText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.textTertiary,
  },
});
