import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import {
  ProfilerProfile,
  ProfilerDevice,
  Employee,
  ApiResponse,
  PaginatedResponse,
} from "@/types/index";

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

const EMPLOYEES_ENDPOINT = "/employees";

export default function CreatePlanScreen() {
  const insets = useSafeAreaInsets();

  // Form state
  const [plannedAt, setPlannedAt] = useState(getTodayString());
  const [selectedProfile, setSelectedProfile] = useState<ProfilerProfile | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<ProfilerDevice | null>(null);
  const [amount, setAmount] = useState("");
  const [batchCount, setBatchCount] = useState(1);
  const [description, setDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  // Calendar state
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  // Data state
  const [profiles, setProfiles] = useState<ProfilerProfile[]>([]);
  const [devices, setDevices] = useState<ProfilerDevice[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<{ completed: number; total: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const response = await apiClient.get<PaginatedResponse<ProfilerProfile>>("/profiles", {
        params: { per_page: 100 },
      });
      setProfiles(response.data.data);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await apiClient.get<ApiResponse<ProfilerDevice[]>>("/devices");
      setDevices(response.data.data);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await apiClient.get<PaginatedResponse<Employee>>(EMPLOYEES_ENDPOINT, {
        params: { per_page: 100 },
      });
      setEmployees(response.data.data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchDevices();
    fetchEmployees();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return profiles;
    const query = profileSearch.toLowerCase().trim();
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.roaster_model ?? "").toLowerCase().includes(query)
    );
  }, [profiles, profileSearch]);

  const filteredDevices = useMemo(() => {
    if (!deviceSearch.trim()) return devices;
    const query = deviceSearch.toLowerCase().trim();
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.model ?? "").toLowerCase().includes(query)
    );
  }, [devices, deviceSearch]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const query = employeeSearch.toLowerCase().trim();
    return employees.filter((e) => e.name.toLowerCase().includes(query));
  }, [employees, employeeSearch]);

  const totalWeightKg = useMemo(
    () => Number(amount) * batchCount,
    [amount, batchCount]
  );

  // Calendar helpers
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
    setPlannedAt(`${calendarYear}-${month}-${dayStr}`);
    setShowDatePicker(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!plannedAt) {
      newErrors.planned_at = "A schedule date is required.";
    }
    if (!selectedProfile) {
      newErrors.profiler_profile_id = "A profile must be selected.";
    }
    if (!selectedDevice) {
      newErrors.profiler_device_id = "A roaster must be selected.";
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
      newErrors.amount = "A valid batch size is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    setSubmissionProgress(null);

    const payload = {
      planned_at: plannedAt,
      profiler_profile_id: selectedProfile!.id,
      profiler_device_id: selectedDevice!.id,
      amount: Math.round(Number(amount) * 1000),
      description: description.trim() || null,
      employee_id: selectedEmployee?.id ?? null,
    };

    try {
      if (batchCount > 1) {
        let completed = 0;
        setSubmissionProgress({ completed: 0, total: batchCount });

        for (let i = 0; i < batchCount; i++) {
          try {
            await apiClient.post("/planning", payload);
            completed++;
            setSubmissionProgress({ completed, total: batchCount });
          } catch (error: any) {
            if (error.response?.status === 422) {
              const serverErrors = error.response.data.errors ?? {};
              const flatErrors: Record<string, string> = {};
              for (const key of Object.keys(serverErrors)) {
                flatErrors[key] = Array.isArray(serverErrors[key])
                  ? serverErrors[key][0]
                  : serverErrors[key];
              }
              setErrors(flatErrors);
            } else {
              setErrors({
                general:
                  completed > 0
                    ? `Created ${completed} of ${batchCount} plans before an error occurred.`
                    : "Something went wrong. Please try again.",
              });
            }
            setSubmitting(false);
            setSubmissionProgress(null);
            return;
          }
        }

        router.back();
      } else {
        await apiClient.post("/planning", payload);
        router.back();
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        const serverErrors = error.response.data.errors ?? {};
        const flatErrors: Record<string, string> = {};
        for (const key of Object.keys(serverErrors)) {
          flatErrors[key] = Array.isArray(serverErrors[key])
            ? serverErrors[key][0]
            : serverErrors[key];
        }
        setErrors(flatErrors);
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setSubmitting(false);
      setSubmissionProgress(null);
    }
  };

  const isFormValid =
    plannedAt && selectedProfile && selectedDevice && amount && Number(amount) >= 0;

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
              <Text style={styles.headerTitle}>New Plan</Text>
              <Text style={styles.headerSubtitle}>Schedule a Roast</Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errors.general ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Date Picker */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.planned_at ? styles.pickerButtonError : null]}
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
              <Text style={styles.pickerButtonText}>
                {plannedAt ? formatDateDisplay(plannedAt) : "Select date"}
              </Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            {errors.planned_at ? (
              <Text style={styles.fieldError}>{errors.planned_at}</Text>
            ) : null}
          </View>

          {/* Profile Picker */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Profile</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                errors.profiler_profile_id ? styles.pickerButtonError : null,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setProfileSearch("");
                setShowProfilePicker(true);
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 20V10M18 20V4M6 20v-4"
                  stroke={Colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.pickerButtonContent}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedProfile && styles.pickerButtonPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedProfile ? selectedProfile.name : "Select profile"}
                </Text>
                {selectedProfile?.roaster_model ? (
                  <Text style={styles.pickerButtonSubtext}>
                    {selectedProfile.roaster_model}
                  </Text>
                ) : null}
              </View>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            {errors.profiler_profile_id ? (
              <Text style={styles.fieldError}>{errors.profiler_profile_id}</Text>
            ) : null}
          </View>

          {/* Device Picker */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Roaster</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                errors.profiler_device_id ? styles.pickerButtonError : null,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                setDeviceSearch("");
                setShowDevicePicker(true);
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M2 6h20v12H2zM12 6V2M6 6V4M18 6V4"
                  stroke={Colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <View style={styles.pickerButtonContent}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedDevice && styles.pickerButtonPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedDevice ? selectedDevice.name : "Select roaster"}
                </Text>
                {selectedDevice?.model ? (
                  <Text style={styles.pickerButtonSubtext}>{selectedDevice.model}</Text>
                ) : null}
              </View>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            {errors.profiler_device_id ? (
              <Text style={styles.fieldError}>{errors.profiler_device_id}</Text>
            ) : null}
          </View>

          {/* Employee Picker */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Operator{" "}
              <Text style={styles.fieldLabelOptional}>(optional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              activeOpacity={0.7}
              onPress={() => {
                setEmployeeSearch("");
                setShowEmployeePicker(true);
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  stroke={Colors.textSecondary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={[
                  styles.pickerButtonText,
                  !selectedEmployee && styles.pickerButtonPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedEmployee ? selectedEmployee.name : "Select operator"}
              </Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Batch Size</Text>
            <View
              style={[
                styles.inputRow,
                errors.amount ? styles.inputRowError : null,
              ]}
            >
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>kg</Text>
              </View>
            </View>
            {errors.amount ? (
              <Text style={styles.fieldError}>{errors.amount}</Text>
            ) : null}
          </View>

          {/* Batch Count Stepper */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Number of Batches</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperButton, batchCount <= 1 && styles.stepperButtonDisabled]}
                activeOpacity={0.7}
                onPress={() => setBatchCount((c) => Math.max(1, c - 1))}
                disabled={batchCount <= 1}
              >
                <Text style={[styles.stepperButtonText, batchCount <= 1 && styles.stepperButtonTextDisabled]}>-</Text>
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{batchCount}</Text>
              </View>
              <TouchableOpacity
                style={styles.stepperButton}
                activeOpacity={0.7}
                onPress={() => setBatchCount((c) => c + 1)}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Weight Summary */}
          {batchCount > 1 && amount && !isNaN(Number(amount)) && Number(amount) > 0 ? (
            <View style={styles.totalWeightCard}>
              <Text style={styles.totalWeightLabel}>Total Weight</Text>
              <Text style={styles.totalWeightValue}>{totalWeightKg} kg</Text>
              <Text style={styles.totalWeightBreakdown}>
                {batchCount} batches x {amount} kg each
              </Text>
            </View>
          ) : null}

          {/* Description */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>
              Description{" "}
              <Text style={styles.fieldLabelOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add notes about this roast..."
              placeholderTextColor={Colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid || submitting) && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={!isFormValid || submitting}
          >
            {submitting ? (
              submissionProgress ? (
                <Text style={styles.submitButtonText}>
                  Creating {submissionProgress.completed}/{submissionProgress.total}...
                </Text>
              ) : (
                <ActivityIndicator size="small" color={Colors.text} />
              )
            ) : (
              <Text style={styles.submitButtonText}>
                {batchCount > 1 ? `Create ${batchCount} Plans` : "Create Plan"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
                const isSelected = dayStr === plannedAt;
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

      {/* Profile Picker Modal */}
      <Modal
        visible={showProfilePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProfilePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Profile</Text>
              <TouchableOpacity
                onPress={() => setShowProfilePicker(false)}
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

            {/* Search */}
            <View style={styles.modalSearchBar}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search profiles..."
                placeholderTextColor={Colors.textTertiary}
                value={profileSearch}
                onChangeText={setProfileSearch}
                autoFocus
              />
            </View>

            {loadingProfiles ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.slate} />
              </View>
            ) : (
              <FlatList
                data={filteredProfiles}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>No profiles found</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = selectedProfile?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedProfile(item);
                        if (item.start_weight != null && item.start_weight > 0) {
                          setAmount(String(item.start_weight / 1000));
                        }
                        setShowProfilePicker(false);
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <Text
                          style={[
                            styles.pickerItemName,
                            isActive && styles.pickerItemNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {item.roaster_model ? (
                          <Text style={styles.pickerItemMeta}>{item.roaster_model}</Text>
                        ) : null}
                      </View>
                      {isActive ? (
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M20 6L9 17l-5-5"
                            stroke={Colors.safety}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Device Picker Modal */}
      <Modal
        visible={showDevicePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDevicePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Roaster</Text>
              <TouchableOpacity
                onPress={() => setShowDevicePicker(false)}
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

            {/* Search */}
            <View style={styles.modalSearchBar}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search roasters..."
                placeholderTextColor={Colors.textTertiary}
                value={deviceSearch}
                onChangeText={setDeviceSearch}
                autoFocus
              />
            </View>

            {loadingDevices ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.slate} />
              </View>
            ) : (
              <FlatList
                data={filteredDevices}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>No roasters found</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = selectedDevice?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedDevice(item);
                        setShowDevicePicker(false);
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <Text
                          style={[
                            styles.pickerItemName,
                            isActive && styles.pickerItemNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.pickerItemMeta}>
                          {item.model}
                          {item.serial_number ? ` - ${item.serial_number}` : ""}
                        </Text>
                      </View>
                      {isActive ? (
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M20 6L9 17l-5-5"
                            stroke={Colors.safety}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Employee Picker Modal */}
      <Modal
        visible={showEmployeePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmployeePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Operator</Text>
              <TouchableOpacity
                onPress={() => setShowEmployeePicker(false)}
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

            {/* Search */}
            <View style={styles.modalSearchBar}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
                  stroke={Colors.textTertiary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search operators..."
                placeholderTextColor={Colors.textTertiary}
                value={employeeSearch}
                onChangeText={setEmployeeSearch}
                autoFocus
              />
            </View>

            {loadingEmployees ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.slate} />
              </View>
            ) : (
              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[styles.pickerItem, !selectedEmployee && styles.pickerItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedEmployee(null);
                      setShowEmployeePicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text
                        style={[
                          styles.pickerItemName,
                          !selectedEmployee && styles.pickerItemNameActive,
                        ]}
                      >
                        No operator
                      </Text>
                    </View>
                    {!selectedEmployee ? (
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M20 6L9 17l-5-5"
                          stroke={Colors.safety}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    ) : null}
                  </TouchableOpacity>
                }
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>No operators found</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = selectedEmployee?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedEmployee(item);
                        setShowEmployeePicker(false);
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <Text
                          style={[
                            styles.pickerItemName,
                            isActive && styles.pickerItemNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </View>
                      {isActive ? (
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M20 6L9 17l-5-5"
                            stroke={Colors.safety}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

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

  /* -- Content -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  /* -- Error Banner -- */
  errorBanner: {
    backgroundColor: Colors.trafficBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.traffic,
    padding: 14,
  },
  errorBannerText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.traffic,
  },

  /* -- Field Card -- */
  fieldCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  fieldLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 10,
  },
  fieldLabelOptional: {
    fontFamily: "DMSans-Regular",
    color: Colors.textTertiary,
  },
  fieldError: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.traffic,
    marginTop: 8,
  },

  /* -- Picker Button -- */
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  pickerButtonError: {
    borderColor: Colors.traffic,
  },
  pickerButtonContent: {
    flex: 1,
  },
  pickerButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  pickerButtonPlaceholder: {
    color: Colors.textTertiary,
  },
  pickerButtonSubtext: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  /* -- Amount Input -- */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  inputRowError: {
    borderColor: Colors.traffic,
  },
  amountInput: {
    flex: 1,
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unitBadge: {
    backgroundColor: Colors.gravelLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  unitBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* -- Description Input -- */
  descriptionInput: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 80,
  },

  /* -- Bottom Bar -- */
  bottomBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: Colors.safety,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
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
  modalContentFull: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
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

  /* -- Modal Search -- */
  modalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalListContent: {
    gap: 4,
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },

  /* -- Picker Item -- */
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 12,
  },
  pickerItemActive: {
    backgroundColor: Colors.gravelLight,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemName: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  pickerItemNameActive: {
    fontFamily: "DMSans-SemiBold",
  },
  pickerItemMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  /* -- Batch Count Stepper -- */
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
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
  stepperValue: {
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 20,
    color: Colors.text,
  },

  /* -- Total Weight Card -- */
  totalWeightCard: {
    backgroundColor: Colors.skyBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.sky,
    padding: 16,
  },
  totalWeightLabel: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.sky,
    marginBottom: 4,
  },
  totalWeightValue: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  totalWeightBreakdown: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
