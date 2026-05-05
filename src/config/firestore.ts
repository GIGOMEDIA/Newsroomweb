import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';

import { firebaseConfig } from './firebase';

const ensureApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
};

const app = ensureApp();

// React Native's networking layer doesn't reliably support Firestore's
// default WebChannel transport. Force long-polling so writes/reads stop
// hanging on Android and iOS. initializeFirestore can only be called once
// per app, so fall back to getFirestore on hot reload.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  firestore = getFirestore(app);
}

export const db = firestore;
