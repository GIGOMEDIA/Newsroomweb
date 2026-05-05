import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

export type NetworkStatus = {
  isOnline: boolean;
  isChecking: boolean;
};

/**
 * Derives a boolean "is the device truly online" from an Expo Network state.
 * Treats `undefined` reachability as online (some platforms don't report it),
 * but treats explicit `false` on either flag as offline.
 */
const computeOnline = (state: Network.NetworkState): boolean => {
  if (state.isConnected === false) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
};

/**
 * React hook exposing live connectivity state. Performs an initial async probe
 * via `getNetworkStateAsync` and then subscribes to OS-level changes. Uses an
 * `isActive` flag to ignore late results after unmount and prevent setState on
 * an unmounted component.
 *
 * Returns:
 *   - isOnline: best-effort connectivity flag (defaults to `true` until probed)
 *   - isChecking: true until the first probe or listener event resolves
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isActive = true;

    const sync = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!isActive) {
          return;
        }
        setIsOnline(computeOnline(state));
      } catch {
        if (isActive) {
          setIsOnline(false);
        }
      } finally {
        if (isActive) {
          setIsChecking(false);
        }
      }
    };

    void sync();

    const subscription = Network.addNetworkStateListener((state) => {
      if (!isActive) {
        return;
      }
      setIsOnline(computeOnline(state));
      setIsChecking(false);
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);

  return { isOnline, isChecking };
}
