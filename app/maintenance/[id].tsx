import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Image,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect, ErrorBoundaryProps } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type {
  MaintenanceTask,
  MaintenanceTaskStep,
  MaintenanceComment,
  SkipImpact,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPriorityConfig(priority: string): { label: string; color: string; bg: string } {
  switch (priority) {
    case "critical":
      return { label: "Critical", color: Colors.traffic, bg: Colors.trafficBg };
    case "high":
      return { label: "High", color: Colors.boven, bg: Colors.bovenBg };
    case "medium":
      return { label: "Medium", color: Colors.sun, bg: Colors.sunBg };
    case "low":
      return { label: "Low", color: Colors.sky, bg: Colors.skyBg };
    default:
      return { label: priority, color: Colors.textSecondary, bg: Colors.gravelLight };
  }
}

function getStatusConfig(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "overdue":
      return { label: "Overdue", color: Colors.traffic, bg: Colors.trafficBg };
    case "pending":
      return { label: "Pending", color: Colors.sky, bg: Colors.skyBg };
    case "in_progress":
      return { label: "In Progress", color: Colors.boven, bg: Colors.bovenBg };
    case "completed":
      return { label: "Completed", color: Colors.leaf, bg: Colors.leafBg };
    case "skipped":
      return { label: "Skipped", color: Colors.textTertiary, bg: Colors.gravelLight };
    default:
      return { label: status, color: Colors.textSecondary, bg: Colors.gravelLight };
  }
}

function getWarrantyStatusConfig(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "active":
      return { label: "Active", color: Colors.leaf, bg: Colors.leafBg };
    case "suspended":
      return { label: "Suspended", color: Colors.sun, bg: Colors.sunBg };
    case "expired":
      return { label: "Expired", color: Colors.traffic, bg: Colors.trafficBg };
    case "voided":
      return { label: "Voided", color: Colors.grape, bg: Colors.grapeBg };
    default:
      return { label: status, color: Colors.textSecondary, bg: Colors.gravelLight };
  }
}

function getComplianceColor(score: number): string {
  if (score >= 80) return Colors.leaf;
  if (score >= 60) return Colors.sun;
  return Colors.traffic;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

function CheckCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 11-5.93-9.14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CircleIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgCircle
        cx={12}
        cy={12}
        r={10}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle
        cx={12}
        cy={7}
        r={4}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ToolIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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

function ImageIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgCircle
        cx={8.5}
        cy={8.5}
        r={1.5}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 15l-5-5L5 21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgCircle
        cx={12}
        cy={12}
        r={10}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Step Completion Modal                                    */
/* ------------------------------------------------------------------ */

function StepCompletionRow({
  step,
  taskId,
  taskStatus,
  onCompleted,
}: {
  step: MaintenanceTaskStep;
  taskId: number;
  taskStatus: string;
  onCompleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [readingValue, setReadingValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);

  const canComplete =
    !step.is_completed &&
    taskStatus !== "completed" &&
    taskStatus !== "skipped";

  const handlePickPhoto = useCallback(async () => {
    Alert.alert("Add Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
          }
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const handleSubmitStep = useCallback(async () => {
    if (step.requires_reading && !readingValue.trim()) {
      Alert.alert("Required", "Please enter a reading value before completing this step.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (photoUri) {
        formData.append("photo", {
          uri: photoUri,
          type: "image/jpeg",
          name: "evidence.jpg",
        } as any);
      }
      if (readingValue.trim()) {
        formData.append("reading_value", readingValue.trim());
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      await apiClient.post(
        `/maintenance/tasks/${taskId}/steps/${step.id}/complete`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setExpanded(false);
      setPhotoUri(null);
      setReadingValue("");
      setNotes("");
      onCompleted();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message ?? "Failed to complete step."
      );
    } finally {
      setSubmitting(false);
    }
  }, [taskId, step.id, step.requires_reading, photoUri, readingValue, notes, onCompleted]);

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndicatorCol}>
        {step.is_completed ? (
          <CheckCircleIcon color={Colors.leaf} />
        ) : (
          <CircleIcon color={Colors.textTertiary} />
        )}
      </View>

      <View style={styles.stepContentCol}>
        <Text style={styles.stepTitle}>{step.title}</Text>

        {step.description ? (
          <Text style={styles.stepDescription}>{step.description}</Text>
        ) : null}

        {step.is_completed && step.completed_by ? (
          <Text style={styles.stepCompletedMeta}>
            Completed by {step.completed_by.name} {"\u00B7"}{" "}
            {formatDateTime(step.completed_at)}
          </Text>
        ) : null}

        {step.is_completed && step.photo_path ? (
          <TouchableOpacity
            style={styles.stepPhotoThumb}
            activeOpacity={0.7}
            onPress={() => setViewPhoto(!viewPhoto)}
          >
            <Image
              source={{ uri: step.photo_path }}
              style={viewPhoto ? styles.stepPhotoFull : styles.stepPhotoSmall}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}

        {step.is_completed && step.reading_value ? (
          <View style={styles.stepReadingRow}>
            <Text style={styles.stepReadingLabel}>
              {step.reading_label ?? "Reading"}:
            </Text>
            <Text style={styles.stepReadingValue}>
              {step.reading_value}
              {step.reading_unit ? ` ${step.reading_unit}` : ""}
            </Text>
          </View>
        ) : null}

        {step.is_completed && step.notes ? (
          <Text style={styles.stepNotes}>{step.notes}</Text>
        ) : null}

        {/* Complete step button */}
        {canComplete && !expanded ? (
          <TouchableOpacity
            style={styles.completeStepButton}
            activeOpacity={0.7}
            onPress={() => setExpanded(true)}
          >
            <Text style={styles.completeStepButtonText}>Complete Step</Text>
          </TouchableOpacity>
        ) : null}

        {/* Expanded completion form */}
        {canComplete && expanded ? (
          <View style={styles.stepForm}>
            {/* Photo picker */}
            <TouchableOpacity
              style={styles.photoPickerButton}
              activeOpacity={0.7}
              onPress={handlePickPhoto}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPickerPlaceholder}>
                  <CameraIcon color={Colors.textTertiary} />
                  <Text style={styles.photoPickerText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Reading input */}
            {step.requires_reading ? (
              <View style={styles.stepInputGroup}>
                <Text style={styles.stepInputLabel}>
                  {step.reading_label ?? "Reading Value"}
                  {step.reading_unit ? ` (${step.reading_unit})` : ""}
                  {" *"}
                </Text>
                <TextInput
                  style={styles.stepInput}
                  value={readingValue}
                  onChangeText={setReadingValue}
                  placeholder="Enter reading value"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            ) : null}

            {/* Notes input */}
            <View style={styles.stepInputGroup}>
              <Text style={styles.stepInputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.stepInput, styles.stepInputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Submit + Cancel */}
            <View style={styles.stepFormActions}>
              <TouchableOpacity
                style={styles.stepFormCancel}
                activeOpacity={0.7}
                onPress={() => {
                  setExpanded(false);
                  setPhotoUri(null);
                  setReadingValue("");
                  setNotes("");
                }}
              >
                <Text style={styles.stepFormCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.stepFormSubmit,
                  submitting && styles.stepFormSubmitDisabled,
                ]}
                activeOpacity={0.7}
                onPress={handleSubmitStep}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.stepFormSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function MaintenanceTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [skipping, setSkipping] = useState(false);

  /* ── Fetch task detail ── */
  const fetchTask = useCallback(async () => {
    try {
      const response = await apiClient.get(`/maintenance/tasks/${id}`);
      setTask(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch maintenance task:", err);
      setError("Failed to load task details.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        if (mounted) {
          await fetchTask();
          setLoading(false);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [fetchTask])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTask();
    setRefreshing(false);
  }, [fetchTask]);

  /* ── Add comment ── */
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await apiClient.post(`/maintenance/tasks/${id}/comments`, {
        comment: newComment.trim(),
      });
      setNewComment("");
      await fetchTask();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message ?? "Failed to add comment."
      );
    } finally {
      setSendingComment(false);
    }
  }, [id, newComment, fetchTask]);

  /* ── Complete task ── */
  const handleCompleteTask = useCallback(async () => {
    Alert.alert(
      "Complete Task",
      "Are you sure you want to mark this task as complete?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            setCompletingTask(true);
            try {
              await apiClient.post(`/maintenance/tasks/${id}/complete`);
              await fetchTask();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ?? "Failed to complete task."
              );
            } finally {
              setCompletingTask(false);
            }
          },
        },
      ]
    );
  }, [id, fetchTask]);

  /* ── Skip task ── */
  const handleSkipTask = useCallback(async () => {
    setSkipping(true);
    try {
      const impactRes = await apiClient.get(
        `/maintenance/tasks/${id}/skip-impact`
      );
      const impact: SkipImpact = impactRes.data;

      const voidWarning = impact.will_void
        ? "\n\nWARNING: Skipping this task will VOID the warranty!"
        : "";
      const scoreMsg = `Compliance score will drop from ${impact.current_score}% to ${impact.projected_score}%.${voidWarning}`;

      Alert.alert("Skip Task", scoreMsg + "\n\nAre you sure you want to skip?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              "Skip Reason",
              "Please provide a reason for skipping this task.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Submit",
                  onPress: async (reason?: string) => {
                    if (!reason?.trim()) {
                      Alert.alert("Error", "A skip reason is required.");
                      return;
                    }
                    try {
                      await apiClient.post(`/maintenance/tasks/${id}/skip`, {
                        skip_reason: reason.trim(),
                      });
                      await fetchTask();
                    } catch (err: any) {
                      Alert.alert(
                        "Error",
                        err.response?.data?.message ?? "Failed to skip task."
                      );
                    }
                  },
                },
              ],
              "plain-text"
            );
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message ?? "Failed to fetch skip impact."
      );
    } finally {
      setSkipping(false);
    }
  }, [id, fetchTask]);

  /* ── Header ── */
  function renderHeader(title?: string) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.navigate("/(tabs)/maintenance")}
            >
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle}>Task Details</Text>
              {title ? (
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {title}
                </Text>
              ) : null}
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
  if (error || !task) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {error ?? "Task not found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.navigate("/(tabs)/maintenance")}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Data ── */
  const priorityCfg = getPriorityConfig(task.priority);
  const statusCfg = getStatusConfig(task.status);
  const isActionable =
    task.status === "pending" ||
    task.status === "in_progress" ||
    task.status === "overdue";
  const steps = task.steps ?? [];
  const comments = task.comments ?? [];
  const warranty = task.warranty;

  return (
    <View style={styles.screen}>
      {renderHeader(task.title)}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isActionable && { paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* ── Task Info Card ── */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: priorityCfg.bg }]}>
              <Text style={[styles.badgeText, { color: priorityCfg.color }]}>
                {task.priority_label || priorityCfg.label}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.badgeText, { color: statusCfg.color }]}>
                {task.status_label || statusCfg.label}
              </Text>
            </View>
          </View>

          {/* Due date */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconRow}>
              <CalendarIcon
                color={
                  task.status === "overdue"
                    ? Colors.traffic
                    : Colors.textTertiary
                }
              />
              <Text style={styles.infoLabel}>Due Date</Text>
            </View>
            <Text
              style={[
                styles.infoValue,
                task.status === "overdue" && { color: Colors.traffic },
              ]}
            >
              {formatDate(task.due_at)}
            </Text>
          </View>
          <View style={styles.infoDivider} />

          {/* Assignee */}
          {task.assignee ? (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoIconRow}>
                  <UserIcon color={Colors.textTertiary} />
                  <Text style={styles.infoLabel}>Assignee</Text>
                </View>
                <Text style={styles.infoValue}>{task.assignee.name}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          ) : null}

          {/* Asset */}
          {task.asset ? (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoIconRow}>
                  <ToolIcon color={Colors.textTertiary} />
                  <Text style={styles.infoLabel}>Asset</Text>
                </View>
                <Text style={styles.infoValue}>{task.asset.name}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          ) : null}

          {/* Template info */}
          {task.template ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconRow}>
                <ClockIcon color={Colors.textTertiary} />
                <Text style={styles.infoLabel}>{task.template.title}</Text>
              </View>
              {task.template.estimated_minutes ? (
                <Text style={styles.infoValueMuted}>
                  ~{task.template.estimated_minutes} min
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Warranty Compliance Card ── */}
        {warranty ? (
          <View style={styles.card}>
            <View style={styles.warrantyHeader}>
              <ShieldIcon color={Colors.sky} />
              <Text style={styles.sectionTitle}>Warranty & Compliance</Text>
            </View>

            <View style={styles.warrantyScoreRow}>
              <Text
                style={[
                  styles.warrantyScoreValue,
                  { color: getComplianceColor(warranty.compliance_score) },
                ]}
              >
                {warranty.compliance_score}
              </Text>
              <Text
                style={[
                  styles.warrantyScoreSuffix,
                  { color: getComplianceColor(warranty.compliance_score) },
                ]}
              >
                %
              </Text>
            </View>

            <View style={styles.warrantyMetaRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: getWarrantyStatusConfig(warranty.status).bg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: getWarrantyStatusConfig(warranty.status).color,
                    },
                  ]}
                >
                  {getWarrantyStatusConfig(warranty.status).label}
                </Text>
              </View>
              {warranty.expires_at ? (
                <Text style={styles.warrantyExpiry}>
                  Expires {formatDate(warranty.expires_at)}
                </Text>
              ) : null}
            </View>

            {/* Progress bar */}
            <View style={styles.warrantyBarTrack}>
              <View
                style={[
                  styles.warrantyBarFill,
                  {
                    width: `${Math.min(100, Math.max(0, warranty.compliance_score))}%`,
                    backgroundColor: getComplianceColor(
                      warranty.compliance_score
                    ),
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* ── Steps Section ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Steps ({task.steps_completed}/{task.steps_total})
          </Text>

          {steps.length === 0 ? (
            <Text style={styles.emptyText}>No steps defined for this task.</Text>
          ) : (
            <View style={styles.stepsList}>
              {steps.map((step, index) => (
                <View key={step.id}>
                  {index > 0 ? <View style={styles.stepDivider} /> : null}
                  <StepCompletionRow
                    step={step}
                    taskId={task.id}
                    taskStatus={task.status}
                    onCompleted={fetchTask}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Comments Section ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Comments ({task.comments_count})
          </Text>

          {comments.length === 0 ? (
            <Text style={styles.emptyText}>No comments yet.</Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment, index) => (
                <View key={comment.id}>
                  {index > 0 ? <View style={styles.commentDivider} /> : null}
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {getInitials(comment.user.name)}
                      </Text>
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>
                          {comment.user.name}
                        </Text>
                        {comment.is_staff_comment ? (
                          <View style={styles.staffBadge}>
                            <Text style={styles.staffBadgeText}>Staff</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.commentTimestamp}>
                        {formatDateTime(comment.created_at)}
                      </Text>
                      <Text style={styles.commentText}>
                        {comment.comment}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* New comment input */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.commentSendButton,
                (!newComment.trim() || sendingComment) &&
                  styles.commentSendButtonDisabled,
              ]}
              activeOpacity={0.7}
              onPress={handleAddComment}
              disabled={!newComment.trim() || sendingComment}
            >
              {sendingComment ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <SendIcon color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Action Buttons (sticky bottom) ── */}
      {isActionable ? (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.completeTaskButton,
              completingTask && styles.completeTaskButtonDisabled,
            ]}
            activeOpacity={0.7}
            onPress={handleCompleteTask}
            disabled={completingTask}
          >
            {completingTask ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 6L9 17l-5-5"
                    stroke="#fff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.completeTaskButtonText}>Complete Task</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.skipTaskButton,
              skipping && styles.skipTaskButtonDisabled,
            ]}
            activeOpacity={0.7}
            onPress={handleSkipTask}
            disabled={skipping}
          >
            {skipping ? (
              <ActivityIndicator size="small" color={Colors.traffic} />
            ) : (
              <Text style={styles.skipTaskButtonText}>Skip Task</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Error Boundary                                                     */
/* ------------------------------------------------------------------ */

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <Text
        style={{
          fontFamily: "DMSans-SemiBold",
          fontSize: 18,
          color: Colors.text,
          marginBottom: 12,
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontFamily: "DMSans-Regular",
          fontSize: 13,
          color: Colors.textSecondary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {error.message}
      </Text>
      <Text
        style={{
          fontFamily: "JetBrainsMono-Regular",
          fontSize: 11,
          color: Colors.textTertiary,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        {error.stack?.split("\n").slice(0, 5).join("\n")}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: Colors.slate,
          borderRadius: 8,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
        onPress={retry}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            fontSize: 14,
            color: "#ffffff",
          }}
        >
          Try Again
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginTop: 12, paddingVertical: 8 }}
        onPress={() => router.navigate("/(tabs)/maintenance")}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            fontSize: 14,
            color: Colors.sky,
          }}
        >
          Go Back
        </Text>
      </TouchableOpacity>
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
    fontSize: 18,
    color: "#ffffff",
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginBottom: 2,
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

  /* -- Card -- */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },

  /* -- Badges -- */
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
  },

  /* -- Info rows -- */
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  infoValue: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  infoValueMuted: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },

  /* -- Section titles -- */
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },

  /* -- Warranty -- */
  warrantyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  warrantyScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  warrantyScoreValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -2,
  },
  warrantyScoreSuffix: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 24,
    marginLeft: 2,
  },
  warrantyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  warrantyExpiry: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  warrantyBarTrack: {
    height: 8,
    backgroundColor: Colors.gravelLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  warrantyBarFill: {
    height: 8,
    borderRadius: 4,
  },

  /* -- Steps -- */
  stepsList: {
    gap: 0,
  },
  stepDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
  },
  stepIndicatorCol: {
    paddingTop: 2,
  },
  stepContentCol: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  stepDescription: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  stepCompletedMeta: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  stepPhotoThumb: {
    marginTop: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  stepPhotoSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  stepPhotoFull: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  stepReadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  stepReadingLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stepReadingValue: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 12,
    color: Colors.text,
  },
  stepNotes: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  completeStepButton: {
    marginTop: 8,
    backgroundColor: Colors.skyBg,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  completeStepButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
    color: Colors.sky,
  },

  /* -- Step form -- */
  stepForm: {
    marginTop: 10,
    gap: 12,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    padding: 12,
  },
  photoPickerButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  photoPickerPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 16,
    backgroundColor: Colors.card,
  },
  photoPickerText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  photoPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  stepInputGroup: {
    gap: 4,
  },
  stepInputLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stepInput: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
  },
  stepInputMultiline: {
    minHeight: 60,
  },
  stepFormActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  stepFormCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  stepFormCancelText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stepFormSubmit: {
    backgroundColor: Colors.sky,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  stepFormSubmitDisabled: {
    opacity: 0.6,
  },
  stepFormSubmitText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: "#ffffff",
  },

  /* -- Empty text -- */
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },

  /* -- Comments -- */
  commentsList: {
    gap: 0,
    marginBottom: 14,
  },
  commentDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontFamily: "DMSans-Bold",
    fontSize: 12,
    color: Colors.safety,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentAuthor: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  staffBadge: {
    backgroundColor: Colors.grapeBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  staffBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 10,
    color: Colors.grape,
  },
  commentTimestamp: {
    fontFamily: "DMSans-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  commentText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
    marginTop: 4,
  },

  /* -- Comment input -- */
  commentInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
    minHeight: 40,
    maxHeight: 80,
  },
  commentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.sky,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendButtonDisabled: {
    opacity: 0.4,
  },

  /* -- Action bar -- */
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  completeTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.leaf,
    borderRadius: 10,
    paddingVertical: 16,
  },
  completeTaskButtonDisabled: {
    opacity: 0.6,
  },
  completeTaskButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
  skipTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.traffic,
    borderRadius: 10,
    paddingVertical: 14,
  },
  skipTaskButtonDisabled: {
    opacity: 0.6,
  },
  skipTaskButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.traffic,
  },
});
