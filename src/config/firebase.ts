import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
// @ts-expect-error - getReactNativePersistence is exported at runtime in firebase v12 but missing from the bundled types in some builds.
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';

import { env } from '@/utils/env';

export const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  appId: env.firebaseAppId,
  authDomain: env.firebaseAuthDomain,
  messagingSenderId: env.firebaseMessagingSenderId,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  persistence: 'local' as const,
};

export const isFirebaseConfigured =
  Boolean(env.firebaseApiKey) &&
  Boolean(env.firebaseAppId) &&
  Boolean(env.firebaseProjectId);

// Pre-initialize Firebase Auth with AsyncStorage persistence so the
// rn-swiftauth-sdk's AuthProvider attaches to the same instance and sessions
// survive app restarts. Must run before AuthProvider mounts.
if (isFirebaseConfigured) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  try {
    initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized (hot reload). Ignore.
  }
}
