import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/api/client";
import { useTranslation } from "react-i18next";
import { LANGUAGES, changeLanguage, type LanguageCode } from "@/i18n";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, loadUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.first_name ?? user?.name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? user?.name?.split(" ").slice(1).join(" ") ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const hasChanges = useCallback(() => {
    const originalFirstName = user?.first_name ?? user?.name?.split(" ")[0] ?? "";
    const originalLastName = user?.last_name ?? user?.name?.split(" ").slice(1).join(" ") ?? "";
    const nameChanged = firstName !== originalFirstName || lastName !== originalLastName;
    const emailChanged = email !== (user?.email ?? "");
    const passwordChanged = newPassword.length > 0;
    return nameChanged || emailChanged || passwordChanged;
  }, [firstName, lastName, email, newPassword, user]);

  const handleSave = async () => {
    setErrors({});
    setSuccessMessage(null);
    setSaving(true);

    try {
      const payload: Record<string, string> = {};

      const originalFirstName = user?.first_name ?? user?.name?.split(" ")[0] ?? "";
      const originalLastName = user?.last_name ?? user?.name?.split(" ").slice(1).join(" ") ?? "";

      if (firstName !== originalFirstName) {
        payload.first_name = firstName;
      }
      if (lastName !== originalLastName) {
        payload.last_name = lastName;
      }
      if (email !== (user?.email ?? "")) {
        payload.email = email;
      }
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.password = newPassword;
        payload.password_confirmation = confirmPassword;
      }

      await apiClient.put("/auth/profile", payload);
      await loadUser();

      setSuccessMessage(t("profile.profileUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: [t("common.somethingWentWrong")] });
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (field: string): string | null => {
    return errors[field]?.[0] ?? null;
  };

  return (
    <View style={styles.screen}>
      {/* Dark slate header */}
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
              <Text style={styles.headerTitle}>{t("profile.title")}</Text>
              <Text style={styles.headerSubtitle}>{t("profile.subtitle")}</Text>
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.avatarName}>{user?.name ?? t("common.unknown")}</Text>
            <Text style={styles.avatarEmail}>{user?.email ?? ""}</Text>
          </View>

          {/* Success message */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 6L9 17l-5-5"
                  stroke={Colors.leaf}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* General error */}
          {errors.general ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general[0]}</Text>
            </View>
          ) : null}

          {/* Personal Info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("profile.personalInfo")}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.firstName")}</Text>
              <TextInput
                style={[styles.input, getFieldError("first_name") && styles.inputError]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t("profile.firstNamePlaceholder")}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {getFieldError("first_name") ? (
                <Text style={styles.fieldError}>{getFieldError("first_name")}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.lastName")}</Text>
              <TextInput
                style={[styles.input, getFieldError("last_name") && styles.inputError]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t("profile.lastNamePlaceholder")}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {getFieldError("last_name") ? (
                <Text style={styles.fieldError}>{getFieldError("last_name")}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.emailLabel")}</Text>
              <TextInput
                style={[styles.input, getFieldError("email") && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder={t("profile.emailPlaceholder")}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {getFieldError("email") ? (
                <Text style={styles.fieldError}>{getFieldError("email")}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("profile.team")}</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {user?.current_team?.name ?? t("profile.noTeam")}
                </Text>
              </View>
            </View>
          </View>

          {/* Change Password */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.sectionToggle}
              activeOpacity={0.7}
              onPress={() => {
                setShowPassword(!showPassword);
                if (showPassword) {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }
              }}
            >
              <Text style={styles.sectionTitle}>{t("profile.changePassword")}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d={showPassword ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            {showPassword ? (
              <View style={styles.passwordFields}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t("profile.currentPassword")}</Text>
                  <TextInput
                    style={[styles.input, getFieldError("current_password") && styles.inputError]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t("profile.currentPasswordPlaceholder")}
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {getFieldError("current_password") ? (
                    <Text style={styles.fieldError}>{getFieldError("current_password")}</Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t("profile.newPassword")}</Text>
                  <TextInput
                    style={[styles.input, getFieldError("password") && styles.inputError]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t("profile.newPasswordPlaceholder")}
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {getFieldError("password") ? (
                    <Text style={styles.fieldError}>{getFieldError("password")}</Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t("profile.confirmPassword")}</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("profile.confirmPasswordPlaceholder")}
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Language */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
            <Text style={styles.languageSubtitle}>{t("profile.languageSubtitle")}</Text>
            <View style={styles.languageOptions}>
              {LANGUAGES.map((lang) => {
                const isActive = i18n.language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.languageOption, isActive && styles.languageOptionActive]}
                    activeOpacity={0.6}
                    onPress={() => changeLanguage(lang.code as LanguageCode)}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text style={[styles.languageLabel, isActive && styles.languageLabelActive]}>
                      {lang.label}
                    </Text>
                    {isActive && (
                      <View style={styles.languageCheck}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M20 6L9 17l-5-5"
                            stroke={Colors.safety}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, (!hasChanges() || saving) && styles.saveButtonDisabled]}
            activeOpacity={0.7}
            onPress={handleSave}
            disabled={!hasChanges() || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>{t("profile.saveChanges")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

  /* -- Scroll -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },

  /* -- Avatar -- */
  avatarSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: "#ffffff",
  },
  avatarName: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  avatarEmail: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  /* -- Messages -- */
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.leafBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.leaf,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: Colors.trafficBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorBannerText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.traffic,
  },

  /* -- Card -- */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  sectionTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  sectionToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* -- Fields -- */
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
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
  inputError: {
    borderColor: Colors.traffic,
  },
  fieldError: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.traffic,
    marginTop: 4,
  },
  readOnlyField: {
    backgroundColor: Colors.gravelLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  passwordFields: {
    marginTop: 0,
  },

  /* -- Language selector -- */
  languageSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
    marginBottom: 12,
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  languageOptionActive: {
    borderColor: Colors.safety,
    backgroundColor: "rgba(204,255,0,0.06)",
  },
  languageFlag: {
    fontSize: 20,
  },
  languageLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  languageLabelActive: {
    fontFamily: "DMSans-SemiBold",
    color: Colors.text,
  },
  languageCheck: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- Save button -- */
  saveButton: {
    backgroundColor: Colors.slate,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 15,
    color: "#ffffff",
  },
});
