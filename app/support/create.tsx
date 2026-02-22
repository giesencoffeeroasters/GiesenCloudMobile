import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";
import type { TicketAsset } from "@/types/index";

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

function PaperclipIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line
        x1={18}
        y1={6}
        x2={6}
        y2={18}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={6}
        y1={6}
        x2={18}
        y2={18}
        stroke={color}
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

export default function CreateTicketScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  /* ── Form state ── */
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [manualEntry, setManualEntry] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [manualModel, setManualModel] = useState("");
  const [manualSerial, setManualSerial] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<
    { uri: string; name: string; mimeType: string }[]
  >([]);

  /* ── Assets data ── */
  const [assets, setAssets] = useState<TicketAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  /* ── Submit state ── */
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Fetch assets ── */
  const fetchAssets = useCallback(async () => {
    try {
      const response = await apiClient.get("/tickets/assets");
      const data = response.data.data ?? response.data ?? [];
      setAssets(data);
    } catch (err) {
      console.error("Failed to fetch ticket assets:", err);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  /* ── File picking ── */
  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
      });
      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? "application/octet-stream",
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      console.error("Document picker error:", err);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ── Validate ── */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) {
      newErrors.subject = "Subject is required.";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required.";
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
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("description", description.trim());

      if (contactEmail.trim()) {
        formData.append("contact_email", contactEmail.trim());
      }

      if (!manualEntry && selectedAssetId) {
        formData.append("asset_id", String(selectedAssetId));
      }

      if (manualEntry) {
        if (manualModel.trim()) {
          formData.append("roaster_model", manualModel.trim());
        }
        if (manualSerial.trim()) {
          formData.append("serial_number", manualSerial.trim());
        }
        if (manualHours.trim()) {
          formData.append("roasting_hours", manualHours.trim());
        }
      }

      selectedFiles.forEach((file, index) => {
        formData.append(`attachments[${index}]`, {
          uri: file.uri,
          type: file.mimeType,
          name: file.name,
        } as any);
      });

      const response = await apiClient.post("/tickets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newTicket = response.data.data;
      if (newTicket?.id) {
        router.replace(`/support/${newTicket.id}`);
      } else {
        router.back();
      }
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
              <Text style={styles.headerTitle}>New Ticket</Text>
              <Text style={styles.headerSubtitle}>Support & Contact</Text>
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

          {/* Subject */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Subject <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.subject ? styles.textInputError : null,
              ]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary of your issue"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            {errors.subject ? (
              <Text style={styles.fieldError}>{errors.subject}</Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                errors.description ? styles.textInputError : null,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {errors.description ? (
              <Text style={styles.fieldError}>{errors.description}</Text>
            ) : null}
          </View>

          {/* Contact Email */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Contact Email</Text>
            <TextInput
              style={styles.textInput}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.contact_email ? (
              <Text style={styles.fieldError}>{errors.contact_email}</Text>
            ) : null}
          </View>

          {/* Roaster / Machine */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Roaster / Machine</Text>

            {!manualEntry ? (
              <>
                {loadingAssets ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.slate} />
                    <Text style={styles.loadingText}>Loading machines...</Text>
                  </View>
                ) : assets.length === 0 ? (
                  <View style={styles.noAssetsBox}>
                    <Text style={styles.noAssetsText}>
                      No machines found. Enter details manually below.
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      activeOpacity={0.7}
                      onPress={() => setShowAssetPicker(!showAssetPicker)}
                    >
                      <Text
                        style={[
                          styles.pickerButtonText,
                          !selectedAsset && styles.pickerPlaceholder,
                        ]}
                      >
                        {selectedAsset
                          ? selectedAsset.name
                          : "Select a machine..."}
                      </Text>
                      <ChevronDownIcon color={Colors.textSecondary} />
                    </TouchableOpacity>

                    {showAssetPicker ? (
                      <View style={styles.pickerDropdown}>
                        {assets.map((asset) => {
                          const isSelected = asset.id === selectedAssetId;
                          return (
                            <TouchableOpacity
                              key={asset.id}
                              style={[
                                styles.pickerOption,
                                isSelected && styles.pickerOptionSelected,
                              ]}
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedAssetId(asset.id);
                                setShowAssetPicker(false);
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
                                  {asset.name}
                                </Text>
                                {asset.model ? (
                                  <Text style={styles.pickerOptionMeta}>
                                    {asset.model}
                                  </Text>
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

                    {selectedAsset ? (
                      <View style={styles.assetMeta}>
                        {selectedAsset.model && (
                          <Text style={styles.assetMetaText}>
                            Model: {selectedAsset.model}
                          </Text>
                        )}
                        {selectedAsset.serial_number && (
                          <Text style={styles.assetMetaText}>
                            Serial: {selectedAsset.serial_number}
                          </Text>
                        )}
                        {selectedAsset.roasting_hours != null && (
                          <Text style={styles.assetMetaText}>
                            Roasting hours: {selectedAsset.roasting_hours}h
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </>
                )}

                <TouchableOpacity
                  style={styles.manualToggle}
                  activeOpacity={0.7}
                  onPress={() => {
                    setManualEntry(true);
                    setSelectedAssetId(null);
                  }}
                >
                  <Text style={styles.manualToggleText}>
                    Enter Manually
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.textInput}
                  value={manualModel}
                  onChangeText={setManualModel}
                  placeholder="Roaster model (e.g. W15A)"
                  placeholderTextColor={Colors.textTertiary}
                />
                <TextInput
                  style={styles.textInput}
                  value={manualSerial}
                  onChangeText={setManualSerial}
                  placeholder="Serial number"
                  placeholderTextColor={Colors.textTertiary}
                />
                <TextInput
                  style={styles.textInput}
                  value={manualHours}
                  onChangeText={setManualHours}
                  placeholder="Roasting hours"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={styles.manualToggle}
                  activeOpacity={0.7}
                  onPress={() => {
                    setManualEntry(false);
                    setManualModel("");
                    setManualSerial("");
                    setManualHours("");
                  }}
                >
                  <Text style={styles.manualToggleText}>
                    Select from list
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {errors.asset_id ? (
              <Text style={styles.fieldError}>{errors.asset_id}</Text>
            ) : null}
          </View>

          {/* Attachments */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Attachments</Text>

            {selectedFiles.length > 0 && (
              <View style={styles.fileList}>
                {selectedFiles.map((file, index) => (
                  <View
                    key={`${file.name}-${index}`}
                    style={styles.fileItem}
                  >
                    <PaperclipIcon color={Colors.textSecondary} />
                    <Text style={styles.fileItemName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.fileRemoveButton}
                      activeOpacity={0.7}
                      onPress={() => removeFile(index)}
                    >
                      <CloseIcon color={Colors.traffic} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.addFileButton}
              activeOpacity={0.7}
              onPress={handlePickFile}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h14"
                  stroke={Colors.sky}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.addFileButtonText}>Add File</Text>
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
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
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
    minHeight: 100,
    paddingTop: 12,
  },

  /* -- Picker -- */
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
    flex: 1,
    gap: 2,
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
  pickerOptionMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  assetMeta: {
    gap: 2,
  },
  assetMetaText: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  noAssetsBox: {
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    padding: 12,
  },
  noAssetsText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  manualToggle: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  manualToggleText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },

  /* -- File list -- */
  fileList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileItemName: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
  },
  fileRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.trafficBg,
    alignItems: "center",
    justifyContent: "center",
  },
  addFileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.sky,
    borderStyle: "dashed",
  },
  addFileButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
  },

  /* -- Submit button -- */
  submitButton: {
    backgroundColor: Colors.sky,
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
