import { useAuth, AuthStatus } from 'rn-swiftauth-sdk';
import { useMemo } from 'react';

import { useNetworkStatus } from '@/utils/network';

export type EffectiveAuthStatus =
  | 'loading'
  | 'authenticated'
  | 'offline-authenticated'
  | 'unauthenticated';

/**
 * Composes the rn-swiftauth-sdk auth state with live network status into a
 * single hook the app can use to gate screens and navigation.
 *
 * The key derivation is `effectiveStatus`:
 *   - LOADING from auth → 'loading'
 *   - AUTHENTICATED + online → 'authenticated' (full access)
 *   - AUTHENTICATED + offline → 'offline-authenticated' (cached-only mode)
 *   - anything else → 'unauthenticated'
 *
 * The split between 'authenticated' and 'offline-authenticated' lets the UI
 * render the same screens but disable mutations that need the network. Both
 * states report `isAuthenticated: true` so navigation guards stay simple.
 *
 * Returns the original auth fields plus our derived flags, spread together
 * for convenience.
 */
export function useAppAuth() {
  const auth = useAuth();
  const { isOnline, isChecking } = useNetworkStatus();

  const effectiveStatus = useMemo<EffectiveAuthStatus>(() => {
    if (auth.status === AuthStatus.LOADING) {
      return 'loading';
    }

    if (auth.status === AuthStatus.AUTHENTICATED) {
      return isOnline ? 'authenticated' : 'offline-authenticated';
    }

    return 'unauthenticated';
  }, [auth.status, isOnline]);

  const isAuthenticated =
    effectiveStatus === 'authenticated' ||
    effectiveStatus === 'offline-authenticated';

  return {
    ...auth,
    effectiveStatus,
    isAuthenticated,
    isCheckingNetwork: isChecking,
    isOffline: !isOnline,
    isOnline,
  };
}
