import { useState, useCallback, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type {
  TicketDetail,
  ConversationMessage,
  TicketAttachment,
} from "@/types/index";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("closed") || lower.includes("resolved")) return Colors.leaf;
  if (lower.includes("waiting") || lower.includes("pending")) return Colors.sun;
  if (lower.includes("open") || lower.includes("new")) return Colors.sky;
  if (lower.includes("escalat")) return Colors.traffic;
  return Colors.boven;
}

function getStatusBg(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("closed") || lower.includes("resolved")) return Colors.leafBg;
  if (lower.includes("waiting") || lower.includes("pending")) return Colors.sunBg;
  if (lower.includes("open") || lower.includes("new")) return Colors.skyBg;
  if (lower.includes("escalat")) return Colors.trafficBg;
  return Colors.bovenBg;
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

function PaperclipIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

/* ------------------------------------------------------------------ */
/*  Component: Message Bubble                                          */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isCustomer = message.sender_type === "VISITOR";

  return (
    <View
      style={[
        styles.messageBubbleWrap,
        isCustomer ? styles.messageBubbleWrapRight : styles.messageBubbleWrapLeft,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isCustomer ? styles.messageBubbleCustomer : styles.messageBubbleAgent,
        ]}
      >
        <View style={styles.messageSenderRow}>
          <Text style={styles.messageSenderName}>
            {message.sender_name ?? (isCustomer ? "You" : "Support")}
          </Text>
          {message.is_ai_agent && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>
        <Text style={styles.messageContent}>{message.content}</Text>

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <View style={styles.messageAttachments}>
            {message.attachments.map((att) => (
              <TouchableOpacity
                key={att.id}
                style={styles.attachmentLink}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(att.url)}
              >
                <PaperclipIcon color={Colors.sky} />
                <Text style={styles.attachmentLinkText} numberOfLines={1}>
                  {att.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.messageTimestamp}>
          {formatTimestamp(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Message input state */
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<
    { uri: string; name: string; mimeType: string }[]
  >([]);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  /* ── Fetch ticket detail ── */
  const fetchTicket = useCallback(async () => {
    try {
      const response = await apiClient.get(`/tickets/${id}`);
      setTicket(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch ticket:", err);
      setError("Failed to load ticket details.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        if (mounted) {
          await fetchTicket();
          setLoading(false);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [fetchTicket])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTicket();
    setRefreshing(false);
  }, [fetchTicket]);

  /* ── Pick files ── */
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

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    if (!messageText.trim() && selectedFiles.length === 0) return;

    setSending(true);
    try {
      const formData = new FormData();
      if (messageText.trim()) {
        formData.append("message", messageText.trim());
      }
      selectedFiles.forEach((file, index) => {
        formData.append(`attachments[${index}]`, {
          uri: file.uri,
          type: file.mimeType,
          name: file.name,
        } as any);
      });

      await apiClient.post(`/tickets/${id}/message`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessageText("");
      setSelectedFiles([]);
      await fetchTicket();

      // Scroll to bottom after sending
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message ?? "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  }, [id, messageText, selectedFiles, fetchTicket]);

  /* ── Close ticket ── */
  const handleCloseTicket = useCallback(() => {
    Alert.alert(
      "Close Ticket",
      "Are you sure you want to close this ticket? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Ticket",
          style: "destructive",
          onPress: async () => {
            setClosing(true);
            try {
              await apiClient.post(`/tickets/${id}/close`);
              await fetchTicket();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message ?? "Failed to close ticket."
              );
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  }, [id, fetchTicket]);

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
              <Text style={styles.headerSubtitle}>Ticket Details</Text>
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
  if (error || !ticket) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {error ?? "Ticket not found."}
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

  const conversations = ticket.conversations ?? [];

  return (
    <View style={styles.screen}>
      {renderHeader(ticket.subject)}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            !ticket.is_closed && { paddingBottom: 20 },
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
          {/* ── Info Card ── */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: getStatusBg(ticket.status) },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: getStatusColor(ticket.status) },
                  ]}
                >
                  {ticket.status}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(ticket.created_at)}
              </Text>
            </View>
            <View style={styles.infoDivider} />

            {ticket.contact_email ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>{ticket.contact_email}</Text>
                </View>
                <View style={styles.infoDivider} />
              </>
            ) : null}

            {ticket.roaster_info ? (
              <>
                {ticket.roaster_info.model ? (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Model</Text>
                      <Text style={styles.infoValue}>
                        {ticket.roaster_info.model}
                      </Text>
                    </View>
                    <View style={styles.infoDivider} />
                  </>
                ) : null}
                {ticket.roaster_info.serial_number ? (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Serial No.</Text>
                      <Text style={styles.infoValueMono}>
                        {ticket.roaster_info.serial_number}
                      </Text>
                    </View>
                    <View style={styles.infoDivider} />
                  </>
                ) : null}
                {ticket.roaster_info.roasting_hours != null ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Roasting Hours</Text>
                    <Text style={styles.infoValueMono}>
                      {ticket.roaster_info.roasting_hours}h
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          {/* ── Conversation Thread ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Conversation ({conversations.length})
            </Text>

            {conversations.length === 0 ? (
              <Text style={styles.emptyText}>No messages yet.</Text>
            ) : (
              <View style={styles.messagesList}>
                {conversations.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </View>
            )}
          </View>

          {/* ── Close Ticket Button ── */}
          {!ticket.is_closed && (
            <TouchableOpacity
              style={[
                styles.closeTicketButton,
                closing && styles.closeTicketButtonDisabled,
              ]}
              activeOpacity={0.7}
              onPress={handleCloseTicket}
              disabled={closing}
            >
              {closing ? (
                <ActivityIndicator size="small" color={Colors.traffic} />
              ) : (
                <Text style={styles.closeTicketButtonText}>Close Ticket</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Message Input (sticky bottom) ── */}
        {!ticket.is_closed && (
          <View
            style={[
              styles.messageInputBar,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            {/* Selected file previews */}
            {selectedFiles.length > 0 && (
              <View style={styles.selectedFilesRow}>
                {selectedFiles.map((file, index) => (
                  <View key={`${file.name}-${index}`} style={styles.selectedFileChip}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => removeFile(index)}
                    >
                      <CloseIcon color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.messageInputRow}>
              <TouchableOpacity
                style={styles.attachButton}
                activeOpacity={0.7}
                onPress={handlePickFile}
              >
                <PaperclipIcon color={Colors.textSecondary} />
              </TouchableOpacity>

              <TextInput
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!messageText.trim() && selectedFiles.length === 0 || sending) &&
                    styles.sendButtonDisabled,
                ]}
                activeOpacity={0.7}
                onPress={handleSend}
                disabled={
                  (!messageText.trim() && selectedFiles.length === 0) || sending
                }
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <SendIcon color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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

  /* -- Section titles -- */
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },

  /* -- Messages -- */
  messagesList: {
    gap: 12,
  },
  messageBubbleWrap: {
    flexDirection: "row",
  },
  messageBubbleWrapRight: {
    justifyContent: "flex-end",
  },
  messageBubbleWrapLeft: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  messageBubbleCustomer: {
    backgroundColor: Colors.skyBg,
    borderBottomRightRadius: 4,
  },
  messageBubbleAgent: {
    backgroundColor: Colors.gravelLight,
    borderBottomLeftRadius: 4,
  },
  messageSenderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  messageSenderName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 12,
    color: Colors.text,
  },
  aiBadge: {
    backgroundColor: Colors.grapeBg,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 9,
    color: Colors.grape,
  },
  messageContent: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  messageTimestamp: {
    fontFamily: "DMSans-Regular",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  messageAttachments: {
    gap: 6,
    marginTop: 4,
  },
  attachmentLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachmentLinkText: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.sky,
    flex: 1,
  },

  /* -- Close ticket -- */
  closeTicketButton: {
    borderWidth: 1.5,
    borderColor: Colors.traffic,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeTicketButtonDisabled: {
    opacity: 0.6,
  },
  closeTicketButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.traffic,
  },

  /* -- Message Input Bar -- */
  messageInputBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  selectedFilesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  selectedFileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "80%",
  },
  selectedFileName: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  messageInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.gravelLight,
    alignItems: "center",
    justifyContent: "center",
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.gravelLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.text,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.sky,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
