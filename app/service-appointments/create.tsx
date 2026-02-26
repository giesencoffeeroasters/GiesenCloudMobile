import { useState, useEffect, useCallback, useMemo } from "react";
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
  Modal,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Line, Circle as SvgCircle } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { OutsmartWorkType } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ServiceAsset {
  id: number;
  name: string;
  model: string | null;
  serial_number: string | null;
  roasting_hours: number | null;
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

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle
        cx={12}
        cy={13}
        r={4}
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
        x1="18"
        y1="6"
        x2="6"
        y2="18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function CreateServiceAppointmentScreen() {
  const insets = useSafeAreaInsets();

  /* ── Form state ── */
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [roastingHours, setRoastingHours] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(null);

  /* Address */
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  /* Photos */
  const [photos, setPhotos] = useState<{ uri: string; name: string }[]>([]);

  /* ── Data loading ── */
  const [assets, setAssets] = useState<ServiceAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [workTypes, setWorkTypes] = useState<OutsmartWorkType[]>([]);
  const [loadingWorkTypes, setLoadingWorkTypes] = useState(true);

  /* ── Picker visibility ── */
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showWorkTypePicker, setShowWorkTypePicker] = useState(false);

  /* ── Date picker ── */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  /* ── Submit ── */
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Fetch assets ── */
  const fetchAssets = useCallback(async () => {
    try {
      const response = await apiClient.get("/service-appointments/assets");
      setAssets(response.data.data);
    } catch (err) {
      console.error("Failed to fetch service assets:", err);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  /* ── Fetch work types ── */
  const fetchWorkTypes = useCallback(async () => {
    try {
      const response = await apiClient.get("/service-appointments/work-types");
      setWorkTypes(response.data.data);
    } catch (err) {
      console.error("Failed to fetch work types:", err);
    } finally {
      setLoadingWorkTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchWorkTypes();
  }, [fetchAssets, fetchWorkTypes]);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const selectedWorkType = workTypes.find((w) => w.id === selectedWorkTypeId);

  /* ── Auto-fill on asset select ── */
  const handleAssetSelect = useCallback(
    (assetId: number) => {
      setSelectedAssetId(assetId);
      setShowAssetPicker(false);
      const asset = assets.find((a) => a.id === assetId);
      if (asset) {
        if (asset.serial_number) {
          setSerialNumber(asset.serial_number);
        }
        if (asset.roasting_hours != null) {
          setRoastingHours(String(asset.roasting_hours));
        }
      }
    },
    [assets]
  );

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
    setLastServiceDate(`${calendarYear}-${month}-${dayStr}`);
    setShowDatePicker(false);
  };

  /* ── Photo handling ── */
  const handleAddPhoto = useCallback(() => {
    Alert.alert("Add Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Camera access is needed to take photos.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setPhotos((prev) => [
              ...prev,
              {
                uri: asset.uri,
                name: asset.fileName ?? `photo_${Date.now()}.jpg`,
              },
            ]);
          }
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Photo library access is needed to select photos.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsMultipleSelection: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            const newPhotos = result.assets.map((asset) => ({
              uri: asset.uri,
              name: asset.fileName ?? `photo_${Date.now()}.jpg`,
            }));
            setPhotos((prev) => [...prev, ...newPhotos]);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ── Validate ── */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!serialNumber.trim()) {
      newErrors.machine_serial_number = "Machine serial number is required.";
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
      formData.append("machine_serial_number", serialNumber.trim());

      if (selectedAssetId) {
        formData.append("asset_id", String(selectedAssetId));
      }
      if (roastingHours.trim()) {
        formData.append("roasting_hours", roastingHours.trim());
      }
      if (lastServiceDate.trim()) {
        formData.append("last_service_date", lastServiceDate.trim());
      }
      if (serviceNote.trim()) {
        formData.append("service_note", serviceNote.trim());
      }
      if (selectedWorkTypeId) {
        formData.append("work_type_id", String(selectedWorkTypeId));
      }
      if (addressLine1.trim()) {
        formData.append("destination_line1", addressLine1.trim());
      }
      if (addressLine2.trim()) {
        formData.append("destination_line2", addressLine2.trim());
      }
      if (city.trim()) {
        formData.append("destination_city", city.trim());
      }
      if (state.trim()) {
        formData.append("destination_state", state.trim());
      }
      if (postalCode.trim()) {
        formData.append("destination_postal_code", postalCode.trim());
      }
      if (country.trim()) {
        formData.append("destination_country", country.trim());
      }

      photos.forEach((photo, index) => {
        formData.append(`photos[${index}]`, {
          uri: photo.uri,
          type: "image/jpeg",
          name: photo.name,
        } as any);
      });

      await apiClient.post("/service-appointments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.back();
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
              <Text style={styles.headerTitle}>New Service Appointment</Text>
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

          {/* ── Machine Selection ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Machine</Text>

            {loadingAssets ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={Colors.slate} />
                <Text style={styles.loadingText}>Loading assets...</Text>
              </View>
            ) : assets.length === 0 ? (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>
                  No assets available. Enter the serial number manually below.
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
                    {selectedAsset?.name ?? "Select a machine..."}
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
                          onPress={() => handleAssetSelect(asset.id)}
                        >
                          <View style={styles.pickerOptionContent}>
                            <Text
                              style={[
                                styles.pickerOptionText,
                                isSelected && styles.pickerOptionTextSelected,
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
                          {isSelected ? <CheckIcon color={Colors.leaf} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </>
            )}
          </View>

          {/* ── Details ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Serial Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.monoInput,
                errors.machine_serial_number ? styles.textInputError : null,
              ]}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="e.g. GCS-2024-001"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
            />
            {errors.machine_serial_number ? (
              <Text style={styles.fieldError}>
                {errors.machine_serial_number}
              </Text>
            ) : null}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Roasting Hours
            </Text>
            <TextInput
              style={styles.textInput}
              value={roastingHours}
              onChangeText={setRoastingHours}
              placeholder="e.g. 1500"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Last Service Date
            </Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={[styles.pickerButton, { flex: 1 }]}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker(true)}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke={Colors.textSecondary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M16 2v4M8 2v4M3 10h18"
                    stroke={Colors.textSecondary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !lastServiceDate && styles.pickerPlaceholder,
                  ]}
                >
                  {lastServiceDate
                    ? formatDateDisplay(lastServiceDate)
                    : "Select date (optional)"}
                </Text>
                <ChevronDownIcon color={Colors.textTertiary} />
              </TouchableOpacity>
              {lastServiceDate ? (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  activeOpacity={0.7}
                  onPress={() => setLastServiceDate("")}
                >
                  <CloseIcon color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Service Note
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={serviceNote}
              onChangeText={setServiceNote}
              placeholder="Describe the issue or reason for the appointment..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Service Type ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Service Type</Text>

            {loadingWorkTypes ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={Colors.slate} />
                <Text style={styles.loadingText}>Loading work types...</Text>
              </View>
            ) : workTypes.length === 0 ? (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>
                  No work types available.
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  activeOpacity={0.7}
                  onPress={() => setShowWorkTypePicker(!showWorkTypePicker)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !selectedWorkType && styles.pickerPlaceholder,
                    ]}
                  >
                    {selectedWorkType?.title ?? "Select a work type..."}
                  </Text>
                  <ChevronDownIcon color={Colors.textSecondary} />
                </TouchableOpacity>

                {showWorkTypePicker ? (
                  <View style={styles.pickerDropdown}>
                    {workTypes.map((wt) => {
                      const isSelected = wt.id === selectedWorkTypeId;
                      return (
                        <TouchableOpacity
                          key={wt.id}
                          style={[
                            styles.pickerOption,
                            isSelected && styles.pickerOptionSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedWorkTypeId(wt.id);
                            setShowWorkTypePicker(false);
                          }}
                        >
                          <View style={styles.pickerOptionContent}>
                            <Text
                              style={[
                                styles.pickerOptionText,
                                isSelected && styles.pickerOptionTextSelected,
                              ]}
                            >
                              {wt.title}
                            </Text>
                            {wt.display_description ? (
                              <Text
                                style={styles.pickerOptionMeta}
                                numberOfLines={2}
                              >
                                {wt.display_description}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected ? <CheckIcon color={Colors.leaf} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {selectedWorkType?.display_description ? (
                  <Text style={styles.workTypeMeta}>
                    {selectedWorkType.display_description}
                  </Text>
                ) : null}
              </>
            )}
            {errors.work_type_id ? (
              <Text style={styles.fieldError}>{errors.work_type_id}</Text>
            ) : null}
          </View>

          {/* ── Location ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Location</Text>

            <TextInput
              style={styles.textInput}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="Address Line 1"
              placeholderTextColor={Colors.textTertiary}
            />
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Address Line 2 (optional)"
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={styles.twoColumnRow}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={Colors.textTertiary}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                value={state}
                onChangeText={setState}
                placeholder="State/Province"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.twoColumnRow}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Postal Code"
                placeholderTextColor={Colors.textTertiary}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          {/* ── Photos ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Photos</Text>

            {photos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosRow}
              >
                {photos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} style={styles.photoThumbContainer}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.photoRemoveButton}
                      activeOpacity={0.7}
                      onPress={() => removePhoto(index)}
                    >
                      <CloseIcon color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={styles.addPhotoButton}
              activeOpacity={0.7}
              onPress={handleAddPhoto}
            >
              <CameraIcon color={Colors.sky} />
              <Text style={styles.addPhotoButtonText}>Add Photo</Text>
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
              <Text style={styles.submitButtonText}>
                Request Service Appointment
              </Text>
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
          <View
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
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
              <TouchableOpacity
                onPress={handlePrevMonth}
                activeOpacity={0.7}
                style={styles.calendarNavButton}
              >
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
              <TouchableOpacity
                onPress={handleNextMonth}
                activeOpacity={0.7}
                style={styles.calendarNavButton}
              >
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
                const isSelected = dayStr === lastServiceDate;
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
  monoInput: {
    fontFamily: "JetBrainsMono-Regular",
  },
  textInputError: {
    borderColor: Colors.traffic,
  },
  textArea: {
    minHeight: 80,
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
    flex: 1,
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
    fontSize: 12,
    color: Colors.textTertiary,
  },
  workTypeMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },

  /* -- Loading / no data -- */
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
  noDataBox: {
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    padding: 12,
  },
  noDataText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* -- Two-column layout -- */
  twoColumnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  halfInput: {
    flex: 1,
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

  /* -- Photos -- */
  photosRow: {
    gap: 10,
    paddingVertical: 4,
  },
  photoThumbContainer: {
    position: "relative",
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoRemoveButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.sky,
    borderStyle: "dashed",
  },
  addPhotoButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.sky,
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
