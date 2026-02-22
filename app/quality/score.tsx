import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type {
  CuppingSessionDetail,
  CuppingSample,
  CuppingFormAttribute,
  CuppingDescriptorCategory,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */

interface SelectedDescriptor {
  cupping_form_attribute_id: number;
  cupping_descriptor_id: number;
  name: string;
  is_positive: boolean;
  intensity: "low" | "medium" | "high" | null;
}

interface FlatDescriptor {
  id: number;
  name: string;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const isHedonicAttr = (a: CuppingFormAttribute) =>
  !a.has_cup_tracking &&
  Number(a.max_score) === 9 &&
  Number(a.step) === 1;

const cycleIntensity = (
  current: "low" | "medium" | "high" | null
): "low" | "medium" | "high" | null => {
  switch (current) {
    case null:
      return "low";
    case "low":
      return "medium";
    case "medium":
      return "high";
    case "high":
      return null;
  }
};

const intensityLabel = (v: "low" | "medium" | "high" | null) => {
  switch (v) {
    case "low":
      return "L";
    case "medium":
      return "M";
    case "high":
      return "H";
    default:
      return "-";
  }
};

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Score Stepper (intensity / traditional attributes)      */
/* ------------------------------------------------------------------ */

function ScoreStepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const canDecrement = value - step >= min - 0.001;
  const canIncrement = value + step <= max + 0.001;

  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[
            styles.stepperButton,
            !canDecrement && styles.stepperButtonDisabled,
          ]}
          activeOpacity={0.7}
          onPress={() =>
            canDecrement &&
            onChange(Math.max(min, +(value - step).toFixed(2)))
          }
          disabled={!canDecrement}
        >
          <Text
            style={[
              styles.stepperButtonText,
              !canDecrement && styles.stepperButtonTextDisabled,
            ]}
          >
            -
          </Text>
        </TouchableOpacity>
        <View style={styles.stepperValueBox}>
          <Text style={styles.stepperValueText}>{value.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.stepperButton,
            !canIncrement && styles.stepperButtonDisabled,
          ]}
          activeOpacity={0.7}
          onPress={() =>
            canIncrement &&
            onChange(Math.min(max, +(value + step).toFixed(2)))
          }
          disabled={!canIncrement}
        >
          <Text
            style={[
              styles.stepperButtonText,
              !canIncrement && styles.stepperButtonTextDisabled,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Hedonic Scale (quality / affective attributes 1-9)      */
/* ------------------------------------------------------------------ */

function HedonicScale({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const options: number[] = [];
  for (let i = min; i <= max; i++) options.push(i);

  return (
    <View style={styles.hedonicRow}>
      <Text style={styles.hedonicLabel}>{label}</Text>
      <View style={styles.hedonicCircles}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.hedonicCircle,
                selected && styles.hedonicCircleSelected,
              ]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.hedonicCircleText,
                  selected && styles.hedonicCircleTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Cup Toggle Row                                          */
/* ------------------------------------------------------------------ */

function CupToggleRow({
  label,
  cups,
  onChange,
}: {
  label: string;
  cups: boolean[];
  onChange: (cups: boolean[]) => void;
}) {
  return (
    <View style={styles.cupRow}>
      <Text style={styles.cupRowLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.cupToggles}>
        {cups.map((passed, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.cupToggle,
              passed ? styles.cupTogglePassed : styles.cupToggleFailed,
            ]}
            activeOpacity={0.7}
            onPress={() => {
              const next = [...cups];
              next[idx] = !next[idx];
              onChange(next);
            }}
          >
            <Text
              style={[
                styles.cupToggleText,
                passed
                  ? styles.cupToggleTextPassed
                  : styles.cupToggleTextFailed,
              ]}
            >
              {idx + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Descriptor Chip                                         */
/* ------------------------------------------------------------------ */

function DescriptorChip({
  name,
  isPositive,
  intensity,
  onTogglePolarity,
  onCycleIntensity,
  onRemove,
}: {
  name: string;
  isPositive: boolean;
  intensity: "low" | "medium" | "high" | null;
  onTogglePolarity: () => void;
  onCycleIntensity: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.descChip}>
      <Text style={styles.descChipName} numberOfLines={1}>
        {name}
      </Text>
      <TouchableOpacity
        style={[
          styles.descChipPolarity,
          isPositive
            ? styles.descChipPolarityPositive
            : styles.descChipPolarityNegative,
        ]}
        onPress={onTogglePolarity}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.descChipPolarityText,
            { color: isPositive ? Colors.leaf : Colors.traffic },
          ]}
        >
          {isPositive ? "+" : "\u2013"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.descChipIntensity}
        onPress={onCycleIntensity}
        activeOpacity={0.7}
      >
        <Text style={styles.descChipIntensityText}>
          {intensityLabel(intensity)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.descChipRemove}
        onPress={onRemove}
        activeOpacity={0.7}
      >
        <Text style={styles.descChipRemoveText}>{"\u00d7"}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function ScoreSampleScreen() {
  const { sessionId, sampleId } = useLocalSearchParams<{
    sessionId: string;
    sampleId: string;
  }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<CuppingSessionDetail | null>(null);
  const [sample, setSample] = useState<CuppingSample | null>(null);
  const [attributes, setAttributes] = useState<CuppingFormAttribute[]>([]);

  // Score state
  const [scores, setScores] = useState<Record<number, number>>({});
  const [cupScores, setCupScores] = useState<Record<number, boolean[]>>({});
  const [defectCups, setDefectCups] = useState(0);
  const [defectIntensity, setDefectIntensity] = useState("");
  const [notes, setNotes] = useState("");

  // Descriptor state
  const [descriptors, setDescriptors] = useState<SelectedDescriptor[]>([]);
  const [descriptorTree, setDescriptorTree] = useState<
    CuppingDescriptorCategory[]
  >([]);
  const [descriptorModalAttrId, setDescriptorModalAttrId] = useState<
    number | null
  >(null);
  const [descriptorSearch, setDescriptorSearch] = useState("");

  /* ── Flatten descriptor tree for search ── */
  const flatDescriptors = useMemo<FlatDescriptor[]>(() => {
    const result: FlatDescriptor[] = [];
    descriptorTree.forEach((cat) => {
      cat.children.forEach((sub) => {
        if (sub.children.length === 0) {
          result.push({ id: sub.id, name: sub.name, category: cat.name });
        } else {
          sub.children.forEach((item) => {
            result.push({
              id: item.id,
              name: item.name,
              category: `${cat.name} \u203a ${sub.name}`,
            });
          });
        }
      });
    });
    return result;
  }, [descriptorTree]);

  /* ── Data fetching ── */
  const fetchSession = useCallback(async () => {
    try {
      const response = await apiClient.get(`/quality/${sessionId}`);
      const data: CuppingSessionDetail = response.data.data;
      setSession(data);

      const foundSample = data.samples.find(
        (s) => s.id === Number(sampleId)
      );
      setSample(foundSample ?? null);

      const attrs = data.form.attributes ?? [];
      setAttributes(attrs);

      const evalData = foundSample?.my_evaluation;
      const scoreMap: Record<number, number> = {};
      const cupMap: Record<number, boolean[]> = {};

      attrs.forEach((attr) => {
        const existingScore = evalData?.scores?.find(
          (s) => s.cupping_form_attribute_id === attr.id
        );
        scoreMap[attr.id] = existingScore
          ? Number(existingScore.score)
          : Number(attr.min_score);

        if (attr.has_cup_tracking) {
          const existingCups = evalData?.cup_scores?.filter(
            (c) => c.cupping_form_attribute_id === attr.id
          );
          if (existingCups && existingCups.length > 0) {
            const cups = [true, true, true, true, true];
            existingCups.forEach((c) => {
              if (c.cup_number >= 1 && c.cup_number <= 5) {
                cups[c.cup_number - 1] = c.passed;
              }
            });
            cupMap[attr.id] = cups;
          } else {
            cupMap[attr.id] = [true, true, true, true, true];
          }
        }
      });

      setScores(scoreMap);
      setCupScores(cupMap);

      // Pre-populate descriptors
      if (evalData?.descriptors && evalData.descriptors.length > 0) {
        setDescriptors(
          evalData.descriptors.map((d) => ({
            cupping_form_attribute_id: d.cupping_form_attribute_id,
            cupping_descriptor_id: d.cupping_descriptor_id,
            name: d.descriptor_name ?? "Unknown",
            is_positive: d.is_positive,
            intensity: d.intensity,
          }))
        );
      }

      if (evalData) {
        setDefectCups(evalData.defect_cups ?? 0);
        setDefectIntensity(
          evalData.defect_intensity ? String(evalData.defect_intensity) : ""
        );
        setNotes(evalData.notes ?? "");
      }

      setError(null);
    } catch (err) {
      console.error("Failed to fetch session:", err);
      setError("Failed to load session details.");
    }
  }, [sessionId, sampleId]);

  const fetchDescriptors = useCallback(async () => {
    try {
      const response = await apiClient.get("/quality/descriptors");
      setDescriptorTree(response.data.data ?? []);
    } catch {
      // Descriptors are optional — don't block scoring
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSession(), fetchDescriptors()]).finally(() =>
      setLoading(false)
    );
  }, [fetchSession, fetchDescriptors]);

  /* ── Descriptor helpers ── */
  const getDescriptorsForAttr = (attrId: number) =>
    descriptors.filter((d) => d.cupping_form_attribute_id === attrId);

  const toggleDescriptor = (attrId: number, desc: FlatDescriptor) => {
    const exists = descriptors.find(
      (d) =>
        d.cupping_form_attribute_id === attrId &&
        d.cupping_descriptor_id === desc.id
    );
    if (exists) {
      setDescriptors((prev) =>
        prev.filter(
          (d) =>
            !(
              d.cupping_form_attribute_id === attrId &&
              d.cupping_descriptor_id === desc.id
            )
        )
      );
    } else {
      setDescriptors((prev) => [
        ...prev,
        {
          cupping_form_attribute_id: attrId,
          cupping_descriptor_id: desc.id,
          name: desc.name,
          is_positive: true,
          intensity: null,
        },
      ]);
    }
  };

  const removeDescriptor = (attrId: number, descriptorId: number) => {
    setDescriptors((prev) =>
      prev.filter(
        (d) =>
          !(
            d.cupping_form_attribute_id === attrId &&
            d.cupping_descriptor_id === descriptorId
          )
      )
    );
  };

  const togglePolarity = (attrId: number, descriptorId: number) => {
    setDescriptors((prev) =>
      prev.map((d) =>
        d.cupping_form_attribute_id === attrId &&
        d.cupping_descriptor_id === descriptorId
          ? { ...d, is_positive: !d.is_positive }
          : d
      )
    );
  };

  const cycleDescIntensity = (attrId: number, descriptorId: number) => {
    setDescriptors((prev) =>
      prev.map((d) =>
        d.cupping_form_attribute_id === attrId &&
        d.cupping_descriptor_id === descriptorId
          ? { ...d, intensity: cycleIntensity(d.intensity) }
          : d
      )
    );
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const scoresArray = Object.entries(scores).map(([attrId, score]) => ({
        cupping_form_attribute_id: Number(attrId),
        score,
      }));

      const cupScoresArray: {
        cupping_form_attribute_id: number;
        cup_number: number;
        passed: boolean;
      }[] = [];
      Object.entries(cupScores).forEach(([attrId, cups]) => {
        cups.forEach((passed, idx) => {
          cupScoresArray.push({
            cupping_form_attribute_id: Number(attrId),
            cup_number: idx + 1,
            passed,
          });
        });
      });

      const descriptorsArray = descriptors.map((d) => ({
        cupping_form_attribute_id: d.cupping_form_attribute_id,
        cupping_descriptor_id: d.cupping_descriptor_id,
        is_positive: d.is_positive,
        intensity: d.intensity,
      }));

      const payload: Record<string, unknown> = {
        scores: scoresArray,
      };
      if (cupScoresArray.length > 0) {
        payload.cup_scores = cupScoresArray;
      }
      if (descriptorsArray.length > 0) {
        payload.descriptors = descriptorsArray;
      }
      if (defectCups > 0) {
        payload.defect_cups = defectCups;
      }
      if (defectIntensity.trim()) {
        payload.defect_intensity = Number(defectIntensity);
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      await apiClient.post(
        `/quality/${sessionId}/samples/${sampleId}/evaluate`,
        payload
      );
      router.navigate("/(tabs)/quality");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ??
        "Failed to save evaluation. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Computed ── */
  const isEditMode = sample?.my_evaluation != null;
  const formType = session?.form?.type ?? "";
  const isCVA = formType.startsWith("cva_");
  const showDefects =
    formType === "traditional_sca" ||
    formType === "cva_affective" ||
    formType === "cva_combined";

  const hedonicAttrs = attributes.filter(isHedonicAttr);
  const sliderAttrs = attributes.filter(
    (a) => !a.has_cup_tracking && !isHedonicAttr(a)
  );
  const hasDescriptorAttrs = attributes.some((a) => a.has_descriptors);

  /* ── Descriptor modal filtered list ── */
  const filteredDescriptors = useMemo(() => {
    if (!descriptorSearch.trim()) return flatDescriptors;
    const q = descriptorSearch.toLowerCase();
    return flatDescriptors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [flatDescriptors, descriptorSearch]);

  // Group filtered descriptors by category for display
  const groupedDescriptors = useMemo(() => {
    const groups: { category: string; items: FlatDescriptor[] }[] = [];
    const map = new Map<string, FlatDescriptor[]>();
    filteredDescriptors.forEach((d) => {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    });
    map.forEach((items, category) => groups.push({ category, items }));
    return groups;
  }, [filteredDescriptors]);

  /* ── Render attribute with optional descriptors ── */
  function renderAttributeDescriptors(attr: CuppingFormAttribute) {
    if (!attr.has_descriptors || flatDescriptors.length === 0) return null;
    const attrDescs = getDescriptorsForAttr(attr.id);
    return (
      <View style={styles.attrDescriptors}>
        {attrDescs.length > 0 && (
          <View style={styles.descChipWrap}>
            {attrDescs.map((d) => (
              <DescriptorChip
                key={d.cupping_descriptor_id}
                name={d.name}
                isPositive={d.is_positive}
                intensity={d.intensity}
                onTogglePolarity={() =>
                  togglePolarity(attr.id, d.cupping_descriptor_id)
                }
                onCycleIntensity={() =>
                  cycleDescIntensity(attr.id, d.cupping_descriptor_id)
                }
                onRemove={() =>
                  removeDescriptor(attr.id, d.cupping_descriptor_id)
                }
              />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.addDescriptorBtn}
          onPress={() => {
            setDescriptorSearch("");
            setDescriptorModalAttrId(attr.id);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.addDescriptorBtnText}>+ Add Descriptors</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Header ── */
  function renderHeader() {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.navigate("/(tabs)/quality")}
            >
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {sample
                  ? `Sample ${sample.sample_code}${sample.label ? ` \u2014 ${sample.label}` : ""}`
                  : "Score Sample"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode ? "Edit Scores" : "Enter Scores"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  /* ── Error ── */
  if (error || !session || !sample) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {error ?? "Sample not found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.navigate("/(tabs)/quality")}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Main render ── */
  return (
    <View style={styles.screen}>
      {renderHeader()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Descriptive / Intensity / Traditional section ── */}
          {sliderAttrs.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {isCVA ? "Descriptive Assessment" : "Attribute Scores"}
              </Text>
              {isCVA && (
                <Text style={styles.sectionHint}>Intensity (0-15)</Text>
              )}
              <View style={{ gap: 2 }}>
                {sliderAttrs.map((attr) => (
                  <View key={attr.id}>
                    <ScoreStepper
                      label={attr.label}
                      value={scores[attr.id] ?? Number(attr.min_score)}
                      min={Number(attr.min_score)}
                      max={Number(attr.max_score)}
                      step={Number(attr.step)}
                      onChange={(val) =>
                        setScores((prev) => ({ ...prev, [attr.id]: val }))
                      }
                    />
                    {renderAttributeDescriptors(attr)}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Affective / Quality section (hedonic 1-9) ── */}
          {hedonicAttrs.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Affective Assessment</Text>
              <Text style={styles.sectionHint}>
                Quality (1-9)
              </Text>
              <View style={{ gap: 2 }}>
                {hedonicAttrs.map((attr) => (
                  <View key={attr.id}>
                    <HedonicScale
                      label={attr.label}
                      value={scores[attr.id] ?? Number(attr.min_score)}
                      min={Number(attr.min_score)}
                      max={Number(attr.max_score)}
                      onChange={(val) =>
                        setScores((prev) => ({ ...prev, [attr.id]: val }))
                      }
                    />
                    {renderAttributeDescriptors(attr)}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Cup Tracking ── */}
          {Object.keys(cupScores).length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Cup Tracking</Text>
              <Text style={styles.sectionHint}>
                Tap a cup to toggle pass/fail
              </Text>
              <View style={{ gap: 4 }}>
                {attributes
                  .filter((attr) => attr.has_cup_tracking)
                  .map((attr) => (
                    <View key={attr.id}>
                      <CupToggleRow
                        label={attr.label}
                        cups={
                          cupScores[attr.id] ?? [true, true, true, true, true]
                        }
                        onChange={(cups) =>
                          setCupScores((prev) => ({
                            ...prev,
                            [attr.id]: cups,
                          }))
                        }
                      />
                      {renderAttributeDescriptors(attr)}
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* ── Defects ── */}
          {showDefects && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Defects</Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.fieldLabel}>Defect Cups (0-5)</Text>
                  <View style={styles.defectStepperRow}>
                    <TouchableOpacity
                      style={[
                        styles.stepperButton,
                        defectCups <= 0 && styles.stepperButtonDisabled,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        setDefectCups((c) => Math.max(0, c - 1))
                      }
                      disabled={defectCups <= 0}
                    >
                      <Text
                        style={[
                          styles.stepperButtonText,
                          defectCups <= 0 && styles.stepperButtonTextDisabled,
                        ]}
                      >
                        -
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.stepperValueBox}>
                      <Text style={styles.stepperValueText}>
                        {defectCups}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.stepperButton,
                        defectCups >= 5 && styles.stepperButtonDisabled,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        setDefectCups((c) => Math.min(5, c + 1))
                      }
                      disabled={defectCups >= 5}
                    >
                      <Text
                        style={[
                          styles.stepperButtonText,
                          defectCups >= 5 && styles.stepperButtonTextDisabled,
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View>
                  <Text style={styles.fieldLabel}>Defect Intensity</Text>
                  <TextInput
                    style={styles.textInput}
                    value={defectIntensity}
                    onChangeText={setDefectIntensity}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── Notes ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Tasting notes, observations..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.7}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? "Update Scores" : "Submit Scores"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Descriptor Picker Modal ── */}
      <Modal
        visible={descriptorModalAttrId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDescriptorModalAttrId(null)}
      >
        <View
          style={[
            styles.modalContainer,
            { paddingTop: Platform.OS === "ios" ? 16 : insets.top + 8 },
          ]}
        >
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Descriptors</Text>
            <TouchableOpacity
              onPress={() => setDescriptorModalAttrId(null)}
              activeOpacity={0.7}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>{"\u00d7"}</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.modalSearchWrap}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search descriptors..."
              placeholderTextColor={Colors.textTertiary}
              value={descriptorSearch}
              onChangeText={setDescriptorSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Descriptor list */}
          <ScrollView
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
          >
            {groupedDescriptors.map((group) => (
              <View key={group.category}>
                <Text style={styles.modalCategoryHeader}>
                  {group.category}
                </Text>
                {group.items.map((desc) => {
                  const isSelected =
                    descriptorModalAttrId !== null &&
                    descriptors.some(
                      (d) =>
                        d.cupping_form_attribute_id ===
                          descriptorModalAttrId &&
                        d.cupping_descriptor_id === desc.id
                    );
                  return (
                    <TouchableOpacity
                      key={desc.id}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected,
                      ]}
                      onPress={() =>
                        descriptorModalAttrId !== null &&
                        toggleDescriptor(descriptorModalAttrId, desc)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {desc.name}
                      </Text>
                      {isSelected && (
                        <Text style={styles.modalItemCheck}>
                          {"\u2713"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            {groupedDescriptors.length === 0 && (
              <Text style={styles.modalEmpty}>No descriptors found.</Text>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Done button */}
          <View
            style={[
              styles.modalFooter,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setDescriptorModalAttrId(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* -- Header -- */
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
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },

  /* -- Loading / Error -- */
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: "#ffffff",
  },

  /* -- Content -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* -- Section card -- */
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  sectionHint: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: -4,
  },

  /* -- Score Stepper -- */
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepperLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.gravelLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: Colors.text,
  },
  stepperButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  stepperValueBox: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 18,
    color: Colors.text,
  },

  /* -- Hedonic Scale -- */
  hedonicRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  hedonicLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  hedonicCircles: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hedonicCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.gravelLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hedonicCircleSelected: {
    backgroundColor: Colors.slate,
    borderColor: Colors.slate,
  },
  hedonicCircleText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  hedonicCircleTextSelected: {
    color: Colors.safety,
  },

  /* -- Cup Toggle -- */
  cupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cupRowLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  cupToggles: {
    flexDirection: "row",
    gap: 8,
  },
  cupToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  cupTogglePassed: {
    backgroundColor: Colors.leafBg,
    borderColor: Colors.leaf,
  },
  cupToggleFailed: {
    backgroundColor: Colors.trafficBg,
    borderColor: Colors.traffic,
  },
  cupToggleText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
  },
  cupToggleTextPassed: {
    color: Colors.leaf,
  },
  cupToggleTextFailed: {
    color: Colors.traffic,
  },

  /* -- Descriptor chips -- */
  attrDescriptors: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  descChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  descChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    paddingLeft: 10,
    height: 32,
    gap: 2,
  },
  descChipName: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.text,
    maxWidth: 120,
  },
  descChipPolarity: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  descChipPolarityPositive: {
    backgroundColor: Colors.leafBg,
  },
  descChipPolarityNegative: {
    backgroundColor: Colors.trafficBg,
  },
  descChipPolarityText: {
    fontFamily: "DMSans-Bold",
    fontSize: 14,
  },
  descChipIntensity: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.skyBg,
    alignItems: "center",
    justifyContent: "center",
  },
  descChipIntensityText: {
    fontFamily: "DMSans-Bold",
    fontSize: 11,
    color: Colors.sky,
  },
  descChipRemove: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  descChipRemoveText: {
    fontFamily: "DMSans-Bold",
    fontSize: 16,
    color: Colors.textTertiary,
  },
  addDescriptorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  addDescriptorBtnText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* -- Defects -- */
  defectStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  fieldLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },

  /* -- Text input -- */
  textInput: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    marginTop: 6,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  /* -- Submit -- */
  submitButton: {
    backgroundColor: Colors.slate,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },

  /* -- Descriptor Modal -- */
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontFamily: "DMSans-Bold",
    fontSize: 20,
    color: Colors.textSecondary,
    marginTop: -1,
  },
  modalSearchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalSearchInput: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalCategoryHeader: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  modalItemSelected: {
    backgroundColor: Colors.skyBg,
  },
  modalItemText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
  },
  modalItemTextSelected: {
    fontFamily: "DMSans-SemiBold",
    color: Colors.sky,
  },
  modalItemCheck: {
    fontFamily: "DMSans-Bold",
    fontSize: 16,
    color: Colors.sky,
  },
  modalEmpty: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 40,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalDoneBtn: {
    backgroundColor: Colors.slate,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalDoneBtnText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
});
