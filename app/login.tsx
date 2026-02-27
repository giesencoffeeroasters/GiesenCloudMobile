import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { GiesenLogo } from "@/components/GiesenLogo";
import {
  SERVER_OPTIONS,
  getActiveEnv,
  setActiveEnv,
  type AppEnv,
} from "@/constants/config";

const ENV_KEYS: AppEnv[] = ["development", "staging", "production"];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<AppEnv>(getActiveEnv());

  // Hidden dev mode: tap logo 5 times within 3s
  const [devMode, setDevMode] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const login = useAuthStore((state) => state.login);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 3000) {
      tapCountRef.current = 0;
    }
    lastTapRef.current = now;
    tapCountRef.current += 1;
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setDevMode((prev) => !prev);
    }
  };

  const handleEnvChange = (env: AppEnv) => {
    setSelectedEnv(env);
    setActiveEnv(env);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(
          axiosError.response?.data?.message ?? "Invalid credentials. Please try again."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Pressable
          style={styles.logoContainer}
          onPress={handleLogoTap}
        >
          <View style={styles.logoCircle}>
            <GiesenLogo size={36} color={Colors.slate} />
          </View>
        </Pressable>

        <Text style={styles.title}>GiesenCloud</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {devMode && (
          <View style={styles.serverPicker}>
            {ENV_KEYS.map((env) => (
              <TouchableOpacity
                key={env}
                style={[
                  styles.serverOption,
                  selectedEnv === env && styles.serverOptionActive,
                ]}
                activeOpacity={0.7}
                onPress={() => handleEnvChange(env)}
              >
                <View
                  style={[
                    styles.serverDot,
                    {
                      backgroundColor:
                        env === "development"
                          ? Colors.sky
                          : env === "staging"
                          ? Colors.sun
                          : Colors.leaf,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.serverLabel,
                    selectedEnv === env && styles.serverLabelActive,
                  ]}
                >
                  {SERVER_OPTIONS[env].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!isSubmitting}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.card} size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.versionText, { marginBottom: insets.bottom + 12 }]}>
        v2.4.1{devMode ? ` — ${SERVER_OPTIONS[selectedEnv].label}` : ""}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.safety,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "DMSans-Bold",
    fontSize: 28,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  /* Server picker */
  serverPicker: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: 20,
  },
  serverOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 6,
  },
  serverOptionActive: {
    backgroundColor: Colors.slate,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serverLabel: {
    fontFamily: "DMSans-Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  serverLabelActive: {
    color: "#ffffff",
  },
  /* Error */
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.traffic,
    textAlign: "center",
  },
  /* Form */
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: Colors.text,
  },
  input: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 16,
    color: Colors.card,
  },
  versionText: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: "center",
  },
});
