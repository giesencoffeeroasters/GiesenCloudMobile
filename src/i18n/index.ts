import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";
import nl from "./locales/nl.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import tr from "./locales/tr.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import th from "./locales/th.json";
import vi from "./locales/vi.json";
import ar from "./locales/ar.json";
import he from "./locales/he.json";
import fa from "./locales/fa.json";

const LANGUAGE_KEY = "app_language";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
  { code: "he", label: "עברית", flag: "🇮🇱", rtl: true },
  { code: "fa", label: "فارسی", flag: "🇮🇷", rtl: true },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

const SUPPORTED_CODES = new Set(LANGUAGES.map((l) => l.code));

const resources = {
  en: { translation: en },
  nl: { translation: nl },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  it: { translation: it },
  tr: { translation: tr },
  ru: { translation: ru },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  th: { translation: th },
  vi: { translation: vi },
  ar: { translation: ar },
  he: { translation: he },
  fa: { translation: fa },
};

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    const deviceLang = locales[0]?.languageCode ?? "en";
    if (SUPPORTED_CODES.has(deviceLang as LanguageCode)) {
      return deviceLang;
    }
  } catch {
    // Native module not available (e.g. Expo Go)
  }
  return "en";
}

// Register react-i18next immediately so useTranslation works before initI18n
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function isRTL(code?: string): boolean {
  const lang = LANGUAGES.find((l) => l.code === (code ?? i18n.language));
  return !!(lang && "rtl" in lang && lang.rtl);
}

export async function initI18n() {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (savedLanguage && savedLanguage !== i18n.language) {
    await i18n.changeLanguage(savedLanguage);
  }
  return i18n;
}

export async function changeLanguage(code: LanguageCode) {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
