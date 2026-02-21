import { useState, useEffect, useCallback } from "react";
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

  /* ── Forms data ── */
  const [forms, setForms] = useState<CuppingForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [showFormPicker, setShowFormPicker] = useState(false);

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

  /* ── Validate ── */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Session name is required.";
    }
    if (scheduledAt.trim() && isNaN(Date.parse(scheduledAt.trim()))) {
      newErrors.scheduled_at = "Please enter a valid date (YYYY-MM-DD).";
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
              onPress={() => router.back()}
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
            <TextInput
              style={[
                styles.textInput,
                errors.scheduled_at ? styles.textInputError : null,
              ]}
              value={scheduledAt}
              onChangeText={setScheduledAt}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
            {errors.scheduled_at ? (
              <Text style={styles.fieldError}>{errors.scheduled_at}</Text>
            ) : null}
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
