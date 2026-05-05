import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getApps, initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';

import { env } from '@/utils/env';

export const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  appId: env.firebaseAppId,
  authDomain: env.firebaseAuthDomain,
  messagingSenderId: env.firebaseMessagingSenderId,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
};

export const isFirebaseConfigured =
  Boolean(env.firebaseApiKey) &&
  Boolean(env.firebaseAppId) &&
  Boolean(env.firebaseProjectId);

// Initialize Firebase safely across platforms
let app;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  try {
    if (Platform.OS === 'web') {
      // ✅ Web: Firebase handles persistence automatically (localStorage / indexedDB)
      getAuth(app);
    } else {
      // ✅ React Native: use AsyncStorage persistence
      initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    // Ignore "already initialized" errors (common in hot reload)
  }
}

export { app };