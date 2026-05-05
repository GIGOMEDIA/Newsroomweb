import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { QueryClientProvider } from '@tanstack/react-query';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  AppState,
  type AppStateStatus,
  Platform,
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from 'rn-swiftauth-sdk';

import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { AppContextMenuProvider } from '@/components/platform/AppContextMenu';
import { firebaseConfig } from '@/config/firebase';
import { useKeyboardShortcuts } from '@/hooks/platform/useKeyboardShortcuts';
import {
  queryClient,
  queryPersistOptions,
} from '@/services/queryClient';
import { configureGlobalFonts, interFonts } from '@/utils/typography';

// ❗ DO NOT import expo-network or keyboard-controller at top level

function handleAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

function GlobalShortcutLayer() {
  useKeyboardShortcuts();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(interFonts);
  const [splashFinished, setSplashFinished] = useState(false);

  const isWeb = Platform.OS === 'web';

  // ✅ Splash control
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  // ✅ Safe dynamic import (expo-network only on native)
  useEffect(() => {
    if (isWeb) return;

    const setupNetwork = async () => {
      const Network = await import('expo-network');

      onlineManager.setEventListener((setOnline) => {
        const subscription = Network.addNetworkStateListener((state) => {
          setOnline(
            Boolean(state.isConnected) &&
              state.isInternetReachable !== false
          );
        });

        return () => subscription.remove();
      });
    };

    setupNetwork();
  }, [isWeb]);

  // ✅ App focus
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => subscription.remove();
  }, []);

  // ✅ Fonts
  useEffect(() => {
    if (fontsLoaded || fontError) {
      configureGlobalFonts();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // ✅ Provider wrapper (fixes SSR crash)
  const QueryProvider = ({ children }: { children: React.ReactNode }) =>
    queryPersistOptions ? (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={queryPersistOptions}
      >
        {children}
      </PersistQueryClientProvider>
    ) : (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

  return (
    <QueryProvider>
      <SafeAreaProvider>
        {/* ❗ Remove KeyboardProvider on web */}
        {isWeb ? (
          <AuthProvider config={firebaseConfig}>
            <AppContextMenuProvider>
              <GlobalShortcutLayer />

              <Stack>
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    animation: 'fade',
                    contentStyle: { backgroundColor: '#07090B' },
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="article/[id]"
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 260,
                    contentStyle: { backgroundColor: '#07090B' },
                    gestureEnabled: true,
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="interests"
                  options={{
                    animation: 'slide_from_bottom',
                    animationDuration: 260,
                    contentStyle: { backgroundColor: '#07090B' },
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />

                <Stack.Screen
                  name="auth"
                  options={{
                    animation: 'slide_from_bottom',
                    animationDuration: 260,
                    contentStyle: { backgroundColor: '#07090B' },
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
              </Stack>

              <StatusBar
                backgroundColor="#07090B"
                style="light"
                translucent={false}
              />

              {!splashFinished && (
                <AnimatedSplash onFinish={handleSplashFinish} />
              )}
            </AppContextMenuProvider>
          </AuthProvider>
        ) : (
          // ✅ Native-only layer (safe to include extra libs later)
          <AuthProvider config={firebaseConfig}>
            <AppContextMenuProvider>
              <GlobalShortcutLayer />

              <Stack>
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    animation: 'fade',
                    contentStyle: { backgroundColor: '#07090B' },
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="article/[id]"
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 260,
                    contentStyle: { backgroundColor: '#07090B' },
                    gestureEnabled: true,
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="interests"
                  options={{
                    animation: 'slide_from_bottom',
                    animationDuration: 260,
                    contentStyle: { backgroundColor: '#07090B' },
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />

                <Stack.Screen
                  name="auth"
                  options={{
                    animation: 'slide_from_bottom',
                    animationDuration: 260,
                    contentStyle: { backgroundColor: '#07090B' },
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
              </Stack>

              <StatusBar
                backgroundColor="#07090B"
                style="light"
                translucent={false}
              />

              {!splashFinished && (
                <AnimatedSplash onFinish={handleSplashFinish} />
              )}
            </AppContextMenuProvider>
          </AuthProvider>
        )}
      </SafeAreaProvider>
    </QueryProvider>
  );
}