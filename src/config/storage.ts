import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

import { firebaseConfig } from './firebase';

const ensureApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
};

export const storage = getStorage(ensureApp());
