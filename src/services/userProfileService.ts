import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/config/firestore';
import { withTimeout } from '@/utils/async';

export type UserProfile = {
  uid: string;
  verified: boolean;
};

/** Builds a Firestore DocumentReference for the `users/{uid}` document. */
const profileDoc = (uid: string) => doc(db, 'users', uid);
const PROFILE_TIMEOUT_MS = 5000;

/** In-memory cache keyed by uid. Process-lifetime only — cleared on app
 * restart. Sized informally; we never have more than a handful of distinct
 * authors visible on screen at once. */
const cache = new Map<string, UserProfile>();

export const userProfileService = {
  /**
   * Fetches a user profile, with a 5s timeout so a slow Firestore read can't
   * block comment rendering. Cached in memory after the first read.
   *
   * On any failure (timeout, missing doc, network) returns an unverified
   * stub `{ uid, verified: false }` rather than throwing — the verified
   * badge is non-critical UX, so degrading silently is preferable to
   * blocking the comments list. The failed result is NOT cached, so a later
   * call can still succeed.
   */
  async getProfile(uid: string): Promise<UserProfile> {
    const cached = cache.get(uid);
    if (cached) {
      return cached;
    }

    try {
      const snap = await withTimeout(
        getDoc(profileDoc(uid)),
        PROFILE_TIMEOUT_MS,
        'Could not load profile quickly enough.',
      );
      const data = snap.exists() ? snap.data() : null;
      const profile: UserProfile = {
        uid,
        verified: Boolean(data?.verified),
      };
      cache.set(uid, profile);
      return profile;
    } catch {
      return { uid, verified: false };
    }
  },

  /** Drops the cached profile for `uid` so the next read hits Firestore.
   * Call after any action that may flip verification status. */
  invalidate(uid: string) {
    cache.delete(uid);
  },
};
