import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CuppingForm {
  id: number;
  name: string;
  description: string | null;
  type: string;
  is_default: boolean;
  is_system: boolean;
  attributes: {
    id: number;
    name: string;
    label: string;
    min_score: string;
    max_score: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(year: number, month: number): { day: number; date: Date }[] {
  const days: { day: number; date: Date }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, date: new Date(year, month, d) });
  }
  return days;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function CreateQualitySessionScreen() {
  const insets = useSafeAreaInsets();

  /* ── Form state ── */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isBlind, setIsBlind] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);

  /* ── Date picker state ── */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  /* ── Forms data ── */
  const [forms, setForms] = useState<CuppingForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [showFormPicker, setShowFormPicker] = useState(false);

  /* ── Samples state ── */
  const [samples, setSamples] = useState<{ label: string; notes: string }[]>([
    { label: "", notes: "" },
  ]);

  /* ── Submit state ── */
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Fetch forms ── */
  const fetchForms = useCallback(async () => {
    try {
      const response = await apiClient.get("/quality/forms");
      const formList: CuppingForm[] = response.data.data;
      setForms(formList);

      // Select the default form
      const defaultForm = formList.find((f) => f.is_default) ?? formList[0];
      if (defaultForm) {
        setSelectedFormId(defaultForm.id);
      }
    } catch (err) {
      console.error("Failed to fetch cupping forms:", err);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  /* ── Calendar helpers ── */
  const calendarDays = useMemo(
    () => getMonthDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );

  const firstDayOffset = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const month = String(calendarMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    setScheduledAt(`${calendarYear}-${month}-${dayStr}`);
    setShowDatePicker(false);
  };

  /* ── Sample helpers ── */
  function getSampleCode(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C...
  }

  function addSample() {
    setSamples((prev) => [...prev, { label: "", notes: "" }]);
  }

  function removeSample(index: number) {
    setSamples((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSample(index: number, field: "label" | "notes", value: string) {
    setSamples((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  /* ── Validate ── */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Session name is required.";
    }
    if (scheduledAt && isNaN(Date.parse(scheduledAt))) {
      newErrors.scheduled_at = "Please select a valid date.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ── Submit ── */
  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        is_blind: isBlind,
      };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (scheduledAt.trim()) {
        payload.scheduled_at = scheduledAt.trim();
      }
      if (selectedFormId) {
        payload.cupping_form_id = selectedFormId;
      }

      const validSamples = samples.filter((s) => s.label.trim());
      if (validSamples.length > 0) {
        payload.samples = validSamples.map((s) => ({
          label: s.label.trim(),
          notes: s.notes.trim() || null,
        }));
      }

      const response = await apiClient.post("/quality", payload);
      const newSession = response.data.data;

      // Navigate to the new session detail screen
      router.replace(`/quality/${newSession.id}`);
    } catch (err: any) {
      if (err.response?.status === 422) {
        const serverErrors = err.response.data.errors ?? {};
        const flatErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(serverErrors)) {
          flatErrors[key] = Array.isArray(messages)
            ? (messages as string[])[0]
            : String(messages);
        }
        setErrors(flatErrors);
      } else {
        setErrors({
          general:
            err.response?.data?.message ??
            "Something went wrong. Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ── */
  return (
    <View style={styles.screen}>
      {/* Header */}
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
            <View>
              <Text style={styles.headerTitle}>New Session</Text>
              <Text style={styles.headerSubtitle}>Cupping Session</Text>
            </View>
          </View>
        </View>
      </View>

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
          {/* General error */}
          {errors.general ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Session Name */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Session Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.name ? styles.textInputError : null,
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ethiopia Yirgacheffe Cupping"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.name ? (
              <Text style={styles.fieldError}>{errors.name}</Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional notes about this session..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Form Type Picker */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Cupping Form</Text>

            {loadingForms ? (
              <View style={styles.loadingFormsRow}>
                <ActivityIndicator size="small" color={Colors.slate} />
                <Text style={styles.loadingFormsText}>Loading forms...</Text>
              </View>
            ) : forms.length === 0 ? (
              <View style={styles.noFormsBox}>
                <Text style={styles.noFormsText}>
                  No cupping forms available. A default form will be used.
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  activeOpacity={0.7}
                  onPress={() => setShowFormPicker(!showFormPicker)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !selectedForm && styles.pickerPlaceholder,
                    ]}
                  >
                    {selectedForm?.name ?? "Select a form..."}
                  </Text>
                  <ChevronDownIcon color={Colors.textSecondary} />
                </TouchableOpacity>

                {showFormPicker ? (
                  <View style={styles.pickerDropdown}>
                    {forms.map((form) => {
                      const isSelected = form.id === selectedFormId;
                      return (
                        <TouchableOpacity
                          key={form.id}
                          style={[
                            styles.pickerOption,
                            isSelected && styles.pickerOptionSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedFormId(form.id);
                            setShowFormPicker(false);
                          }}
                        >
                          <View style={styles.pickerOptionContent}>
                            <Text
                              style={[
                                styles.pickerOptionText,
                                isSelected &&
                                  styles.pickerOptionTextSelected,
                              ]}
                            >
                              {form.name}
                            </Text>
                            {form.is_system ? (
                              <View style={styles.systemBadge}>
                                <Text style={styles.systemBadgeText}>
                                  System
                                </Text>
                              </View>
                            ) : null}
                            {form.is_default ? (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>
                                  Default
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {isSelected ? (
                            <CheckIcon color={Colors.leaf} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {selectedForm ? (
                  <Text style={styles.formMeta}>
                    {selectedForm.type} -- {selectedForm.attributes.length}{" "}
                    attributes
                  </Text>
                ) : null}
              </>
            )}
            {errors.cupping_form_id ? (
              <Text style={styles.fieldError}>
                {errors.cupping_form_id}
              </Text>
            ) : null}
          </View>

          {/* Blind Tasting Toggle */}
          <View style={styles.fieldCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.fieldLabel}>Blind Tasting</Text>
                <Text style={styles.toggleDescription}>
                  Sample identities will be hidden during scoring
                </Text>
              </View>
              <Switch
                value={isBlind}
                onValueChange={setIsBlind}
                trackColor={{
                  false: Colors.gravel,
                  true: Colors.safety,
                }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Schedule Date */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Schedule Date</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { flex: 1 },
                  errors.scheduled_at ? styles.textInputError : null,
                ]}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker(true)}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
                    stroke={Colors.textSecondary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !scheduledAt && styles.pickerPlaceholder,
                  ]}
                >
                  {scheduledAt
                    ? formatDateDisplay(scheduledAt)
                    : "Select date (optional)"}
                </Text>
                <ChevronDownIcon color={Colors.textTertiary} />
              </TouchableOpacity>
              {scheduledAt ? (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  activeOpacity={0.7}
                  onPress={() => setScheduledAt("")}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 6L6 18M6 6l12 12"
                      stroke={Colors.textSecondary}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
              ) : null}
            </View>
            {errors.scheduled_at ? (
              <Text style={styles.fieldError}>{errors.scheduled_at}</Text>
            ) : null}
          </View>

          {/* Samples */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Samples</Text>
            <View style={{ gap: 12 }}>
              {samples.map((sample, index) => (
                <View key={index} style={styles.sampleEntry}>
                  <View style={styles.sampleEntryHeader}>
                    <View style={styles.sampleCodeBadge}>
                      <Text style={styles.sampleCodeText}>{getSampleCode(index)}</Text>
                    </View>
                    <Text style={styles.sampleEntryTitle}>
                      Sample {index + 1} ({getSampleCode(index)})
                    </Text>
                    {samples.length > 1 ? (
                      <TouchableOpacity
                        style={styles.removeSampleButton}
                        activeOpacity={0.7}
                        onPress={() => removeSample(index)}
                      >
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M18 6L6 18M6 6l12 12"
                            stroke={Colors.traffic}
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={sample.label}
                    onChangeText={(v) => updateSample(index, "label", v)}
                    placeholder="Sample label (e.g. Ethiopia Yirgacheffe)"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TextInput
                    style={[styles.textInput, { minHeight: 50 }]}
                    value={sample.notes}
                    onChangeText={(v) => updateSample(index, "notes", v)}
                    placeholder="Notes (optional)"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.addSampleButton}
              activeOpacity={0.7}
              onPress={addSample}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h14"
                  stroke={Colors.sky}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.addSampleButtonText}>Add Sample</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
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
              <Text style={styles.submitButtonText}>Create Session</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.7}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6l12 12"
                    stroke={Colors.text}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Month navigation */}
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.7} style={styles.calendarNavButton}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M15 18l-6-6 6-6"
                    stroke={Colors.text}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.7} style={styles.calendarNavButton}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18l6-6-6-6"
                    stroke={Colors.text}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.calendarDayHeaders}>
              {DAY_HEADERS.map((label) => (
                <View key={label} style={styles.calendarDayHeaderCell}>
                  <Text style={styles.calendarDayHeaderText}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calendarCell} />
              ))}
              {calendarDays.map(({ day }) => {
                const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = dayStr === scheduledAt;
                const isToday = dayStr === getTodayString();

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                      isToday && !isSelected && styles.calendarCellToday,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectDate(day)}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        isSelected && styles.calendarCellTextSelected,
                        isToday && !isSelected && styles.calendarCellTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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

  /* -- Content -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  /* -- Error banner -- */
  errorBanner: {
    backgroundColor: Colors.trafficBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.traffic,
    padding: 12,
  },
  errorBannerText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.traffic,
  },

  /* -- Field card -- */
  fieldCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  required: {
    color: Colors.traffic,
  },
  fieldError: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.traffic,
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
  },
  textInputError: {
    borderColor: Colors.traffic,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  /* -- Form picker -- */
  pickerButton: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerButtonText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
  },
  pickerPlaceholder: {
    color: Colors.textTertiary,
  },
  pickerDropdown: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.leafBg,
  },
  pickerOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  pickerOptionText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
  },
  pickerOptionTextSelected: {
    fontFamily: "DMSans-SemiBold",
    color: Colors.leaf,
  },
  systemBadge: {
    backgroundColor: Colors.skyBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  systemBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.sky,
  },
  defaultBadge: {
    backgroundColor: Colors.leafBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontFamily: "DMSans-Medium",
    fontSize: 10,
    color: Colors.leaf,
  },
  formMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  loadingFormsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingFormsText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  noFormsBox: {
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    padding: 12,
  },
  noFormsText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* -- Toggle -- */
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  toggleDescription: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* -- Samples -- */
  sampleEntry: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  sampleEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sampleCodeBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  sampleCodeText: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 12,
    color: Colors.safety,
  },
  sampleEntryTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  removeSampleButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.trafficBg,
    alignItems: "center",
    justifyContent: "center",
  },
  addSampleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.sky,
    borderStyle: "dashed",
    marginTop: 4,
  },
  addSampleButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },

  /* -- Date picker row -- */
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearDateButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- Modal -- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },

  /* -- Calendar -- */
  calendarNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  calendarDayHeaders: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarDayHeaderCell: {
    flex: 1,
    alignItems: "center",
  },
  calendarDayHeaderText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellSelected: {
    backgroundColor: Colors.slate,
    borderRadius: 10,
  },
  calendarCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.sky,
    borderRadius: 10,
  },
  calendarCellText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  calendarCellTextSelected: {
    color: Colors.safety,
  },
  calendarCellTextToday: {
    color: Colors.sky,
  },

  /* -- Submit button -- */
  submitButton: {
    backgroundColor: Colors.slate,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
});
