import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const required = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const toPositiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

export const buildApiUrl = (basePath: string, endpoint: string): URL => {
  const path = `${basePath.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  if (/^https?:\/\//i.test(path)) {
    return new URL(path);
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';

  return new URL(path, origin);
};

export const env = {
  // ✅ GNEWS (FIXED)
  apiBaseUrl: required(
    process.env.EXPO_PUBLIC_NEWS_API_BASE_URL,
    'EXPO_PUBLIC_NEWS_API_BASE_URL'
  ),

  apiKey: process.env.EXPO_PUBLIC_NEWS_API_KEY ?? '',

  // ✅ EVENTS
  eventsApiBaseUrl:
    process.env.EXPO_PUBLIC_EVENTS_API_BASE_URL ??
    'https://api.predicthq.com/v1',

  predicthqApiKey: process.env.EXPO_PUBLIC_PREDICTHQ_API_KEY ?? '',

  // ✅ GEMINI
  geminiApiBaseUrl:
    process.env.EXPO_PUBLIC_GEMINI_API_BASE_URL ??
    'https://generativelanguage.googleapis.com/v1beta',

  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash',

  // ✅ GROQ
  groqApiBaseUrl:
    process.env.EXPO_PUBLIC_GROQ_API_BASE_URL ??
    'https://api.groq.com/openai/v1',

  groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
  groqModel:
    process.env.EXPO_PUBLIC_GROQ_MODEL ?? 'llama-3.1-8b-instant',

  // ✅ CEREBRAS
  cerebrasApiBaseUrl:
    process.env.EXPO_PUBLIC_CEREBRAS_API_BASE_URL ??
    'https://api.cerebras.ai/v1',

  cerebrasApiKey: process.env.EXPO_PUBLIC_CEREBRAS_API_KEY ?? '',
  cerebrasModel:
    process.env.EXPO_PUBLIC_CEREBRAS_MODEL ?? 'llama-3.3-70b',

  // ✅ OPENROUTER
  openrouterApiBaseUrl:
    process.env.EXPO_PUBLIC_OPENROUTER_API_BASE_URL ??
    'https://openrouter.ai/api/v1',

  openrouterApiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '',
  openrouterModel:
    process.env.EXPO_PUBLIC_OPENROUTER_MODEL ??
    'meta-llama/llama-3.1-8b-instruct:free',

  // ✅ FIREBASE (optional)
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  firebaseMessagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  firebaseStorageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',

  // ✅ DEFAULTS
  defaultCountry: process.env.EXPO_PUBLIC_NEWS_DEFAULT_COUNTRY ?? 'ng',
  defaultLanguage: process.env.EXPO_PUBLIC_NEWS_DEFAULT_LANGUAGE ?? 'en',

  maxResults: toPositiveInteger(
    process.env.EXPO_PUBLIC_NEWS_MAX_RESULTS,
    20,
  ),
};