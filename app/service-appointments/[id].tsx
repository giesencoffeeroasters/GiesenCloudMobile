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
  Image,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type {
  ServiceAppointmentDetail,
  ServiceAppointmentPlannedStatus,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStatusColor(status: ServiceAppointmentPlannedStatus): string {
  switch (status) {
    case "requested":
      return Colors.sky;
    case "proposal":
      return Colors.sun;
    case "confirmed":
      return Colors.leaf;
    case "executed":
      return Colors.leaf;
    case "declined":
      return Colors.traffic;
  }
}

function getStatusBg(status: ServiceAppointmentPlannedStatus): string {
  switch (status) {
    case "requested":
      return Colors.skyBg;
    case "proposal":
      return Colors.sunBg;
    case "confirmed":
      return Colors.leafBg;
    case "executed":
      return Colors.leafBg;
    case "declined":
      return Colors.trafficBg;
  }
}

function getStatusLabel(status: ServiceAppointmentPlannedStatus): string {
  switch (status) {
    case "requested":
      return "Requested";
    case "proposal":
      return "Proposal";
    case "confirmed":
      return "Confirmed";
    case "executed":
      return "Executed";
    case "declined":
      return "Declined";
  }
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

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
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

function LocationIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 10a3 3 0 11-6 0 3 3 0 016 0z"
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

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function ServiceAppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [appointment, setAppointment] = useState<ServiceAppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  /* ── Fetch ── */
  const fetchAppointment = useCallback(async () => {
    try {
      const response = await apiClient.get(`/service-appointments/${id}`);
      setAppointment(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch service appointment:", err);
      setError("Failed to load appointment details.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        if (mounted) {
          await fetchAppointment();
          setLoading(false);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [fetchAppointment])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointment();
    setRefreshing(false);
  }, [fetchAppointment]);

  /* ── Actions ── */
  const handleConfirm = useCallback(() => {
    Alert.alert(
      "Confirm Appointment",
      "Are you sure you want to confirm this service appointment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setConfirming(true);
            try {
              await apiClient.post(`/service-appointments/${id}/confirm`);
              await fetchAppointment();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ?? "Failed to confirm appointment."
              );
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  }, [id, fetchAppointment]);

  const handleDecline = useCallback(() => {
    Alert.prompt(
      "Decline Appointment",
      "Please provide a reason for declining:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async (reason?: string) => {
            if (!reason?.trim()) {
              Alert.alert("Error", "A decline reason is required.");
              return;
            }
            setDeclining(true);
            try {
              await apiClient.post(`/service-appointments/${id}/decline`, {
                reason: reason.trim(),
              });
              await fetchAppointment();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ?? "Failed to decline appointment."
              );
            } finally {
              setDeclining(false);
            }
          },
        },
      ],
      "plain-text"
    );
  }, [id, fetchAppointment]);

  const handleReschedule = useCallback(() => {
    Alert.prompt(
      "Reschedule Appointment",
      "Please provide a reason for rescheduling:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reschedule",
          onPress: async (reason?: string) => {
            if (!reason?.trim()) {
              Alert.alert("Error", "A reschedule reason is required.");
              return;
            }
            setRescheduling(true);
            try {
              await apiClient.post(`/service-appointments/${id}/reschedule`, {
                reason: reason.trim(),
              });
              await fetchAppointment();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ?? "Failed to reschedule appointment."
              );
            } finally {
              setRescheduling(false);
            }
          },
        },
      ],
      "plain-text"
    );
  }, [id, fetchAppointment]);

  /* ── Header ── */
  function renderHeader(title?: string) {
    return (
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
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle}>Service Appointment</Text>
              {title ? (
                <Text style={styles.headerTitle} numberOfLines={1}>
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
  if (error || !appointment) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {error ?? "Appointment not found."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Data ── */
  const isProposal = appointment.planned_status === "proposal";
  const hasAddress =
    appointment.destination_line1 ||
    appointment.destination_city ||
    appointment.destination_country;
  const hasMaterials = appointment.materials && appointment.materials.length > 0;
  const hasPhotos = appointment.photos && appointment.photos.length > 0;

  return (
    <View style={styles.screen}>
      {renderHeader(appointment.machine_serial_number ?? "Appointment")}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isProposal && { paddingBottom: 180 },
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
        {/* ── Status & Schedule Card ── */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                styles.badgeLarge,
                { backgroundColor: getStatusBg(appointment.planned_status) },
              ]}
            >
              <Text
                style={[
                  styles.badgeTextLarge,
                  { color: getStatusColor(appointment.planned_status) },
                ]}
              >
                {getStatusLabel(appointment.planned_status)}
              </Text>
            </View>
          </View>

          {appointment.work_date ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconRow}>
                <CalendarIcon color={Colors.textTertiary} />
                <Text style={styles.infoLabel}>Work Date</Text>
              </View>
              <Text style={styles.infoValue}>
                {formatDate(appointment.work_date)}
              </Text>
            </View>
          ) : null}

          {appointment.work_time ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{appointment.work_time}</Text>
              </View>
            </>
          ) : null}

          {appointment.work_type ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconRow}>
                  <ToolIcon color={Colors.textTertiary} />
                  <Text style={styles.infoLabel}>Work Type</Text>
                </View>
                <Text style={styles.infoValue}>
                  {appointment.work_type.title}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ── Machine Info Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Machine Info</Text>

          {appointment.asset ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Asset</Text>
              <Text style={styles.infoValue}>{appointment.asset.name}</Text>
            </View>
          ) : null}

          {appointment.asset?.model ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Model</Text>
                <Text style={styles.infoValue}>{appointment.asset.model}</Text>
              </View>
            </>
          ) : null}

          {appointment.machine_serial_number ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Serial Number</Text>
                <Text style={styles.infoValueMono}>
                  {appointment.machine_serial_number}
                </Text>
              </View>
            </>
          ) : null}

          {appointment.roasting_hours != null ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Roasting Hours</Text>
                <Text style={styles.infoValueMono}>
                  {appointment.roasting_hours}
                </Text>
              </View>
            </>
          ) : null}

          {appointment.running_hours != null ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Running Hours</Text>
                <Text style={styles.infoValueMono}>
                  {appointment.running_hours}
                </Text>
              </View>
            </>
          ) : null}

          {appointment.last_service_date ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Service</Text>
                <Text style={styles.infoValue}>
                  {formatDate(appointment.last_service_date)}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ── Service Note Card ── */}
        {appointment.service_note ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Service Note</Text>
            <Text style={styles.noteText}>{appointment.service_note}</Text>
          </View>
        ) : null}

        {/* ── Cost Card ── */}
        {appointment.display_cost ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cost</Text>
            <View style={styles.costRow}>
              {appointment.display_cost_label ? (
                <Text style={styles.costLabel}>
                  {appointment.display_cost_label}
                </Text>
              ) : null}
              <Text style={styles.costValue}>{appointment.display_cost}</Text>
            </View>
            {appointment.cost_change_info ? (
              <Text style={styles.costChangeInfo}>
                {appointment.cost_change_info}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Location Card ── */}
        {hasAddress ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <LocationIcon color={Colors.sky} />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <View style={styles.addressBlock}>
              {appointment.destination_line1 ? (
                <Text style={styles.addressText}>
                  {appointment.destination_line1}
                </Text>
              ) : null}
              {appointment.destination_line2 ? (
                <Text style={styles.addressText}>
                  {appointment.destination_line2}
                </Text>
              ) : null}
              {(appointment.destination_city ||
                appointment.destination_state ||
                appointment.destination_postal_code) ? (
                <Text style={styles.addressText}>
                  {[
                    appointment.destination_city,
                    appointment.destination_state,
                    appointment.destination_postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              ) : null}
              {appointment.destination_country ? (
                <Text style={styles.addressText}>
                  {appointment.destination_country}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Materials Card ── */}
        {hasMaterials ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Materials ({appointment.materials.length})
            </Text>
            {appointment.materials.map((material, index) => (
              <View key={material.id}>
                {index > 0 ? <View style={styles.infoDivider} /> : null}
                <View style={styles.materialRow}>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialName}>{material.name}</Text>
                    {material.quantity != null ? (
                      <Text style={styles.materialQty}>
                        Qty: {material.quantity}
                      </Text>
                    ) : null}
                  </View>
                  {material.price ? (
                    <Text style={styles.materialPrice}>{material.price}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Photos Card ── */}
        {hasPhotos ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <ImageIcon color={Colors.sky} />
              <Text style={styles.sectionTitle}>
                Photos ({appointment.photos.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScroll}
            >
              {appointment.photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  activeOpacity={0.7}
                  onPress={() => Linking.openURL(photo.url)}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Decline Reason ── */}
        {appointment.decline_reason ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Decline Reason</Text>
            <Text style={styles.noteText}>{appointment.decline_reason}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Action Bar (only for proposals) ── */}
      {isProposal ? (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.confirmButton,
              confirming && styles.buttonDisabled,
            ]}
            activeOpacity={0.7}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm</Text>
            )}
          </TouchableOpacity>

          <View style={styles.actionSecondaryRow}>
            <TouchableOpacity
              style={[
                styles.declineButton,
                declining && styles.buttonDisabled,
              ]}
              activeOpacity={0.7}
              onPress={handleDecline}
              disabled={declining}
            >
              {declining ? (
                <ActivityIndicator size="small" color={Colors.traffic} />
              ) : (
                <Text style={styles.declineButtonText}>Decline</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rescheduleButton,
                rescheduling && styles.buttonDisabled,
              ]}
              activeOpacity={0.7}
              onPress={handleReschedule}
              disabled={rescheduling}
            >
              {rescheduling ? (
                <ActivityIndicator size="small" color={Colors.sun} />
              ) : (
                <Text style={styles.rescheduleButtonText}>Reschedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeTextLarge: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 13,
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
  infoValueMono: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },

  /* -- Section -- */
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  /* -- Note -- */
  noteText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  /* -- Cost -- */
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
  },
  costValue: {
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 18,
    color: Colors.text,
  },
  costChangeInfo: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.sun,
    marginTop: 8,
  },

  /* -- Address -- */
  addressBlock: {
    gap: 2,
  },
  addressText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },

  /* -- Materials -- */
  materialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  materialInfo: {
    flex: 1,
    gap: 2,
  },
  materialName: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.text,
  },
  materialQty: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  materialPrice: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 13,
    color: Colors.text,
  },

  /* -- Photos -- */
  photosScroll: {
    gap: 10,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
  confirmButton: {
    backgroundColor: Colors.leaf,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
  actionSecondaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  declineButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.traffic,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  declineButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.traffic,
  },
  rescheduleButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.sun,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rescheduleButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.sun,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
