import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "rn-swiftauth-sdk";

import "react-native-reanimated";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AppContextMenuProvider } from "@/components/platform/AppContextMenu";
import { firebaseConfig } from "@/config/firebase";
import { useKeyboardShortcuts } from "@/hooks/platform/useKeyboardShortcuts";

import { queryClient, queryPersistOptions } from "@/services/queryClient";

import { configureGlobalFonts, interFonts } from "@/utils/typography";

function handleAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

function GlobalShortcutLayer() {
  useKeyboardShortcuts();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(interFonts);
  const [splashFinished, setSplashFinished] = useState(false);

  // Splash control
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  // ✅ FIXED: Network (skip on web)
  useEffect(() => {
    const setupNetwork = async () => {
      if (Platform.OS === "web") return;

      const Network = await import("expo-network");

      onlineManager.setEventListener((setOnline) => {
        const subscription = Network.addNetworkStateListener((state) => {
          setOnline(
            Boolean(state.isConnected) && state.isInternetReachable !== false,
          );
        });

        return () => subscription.remove();
      });
    };

    setupNetwork();
  }, []);

  // App focus
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => subscription.remove();
  }, []);

  // Fonts
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

  const QueryProvider = queryPersistOptions
    ? (props: any) => (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={queryPersistOptions}
          {...props}
        />
      )
    : (props: any) => (
        <QueryClientProvider client={queryClient} {...props} />
      );

  return (
    <QueryProvider>
      <SafeAreaProvider>
        <KeyboardProvider>
          <AuthProvider config={firebaseConfig}>
            <AppContextMenuProvider>
              <GlobalShortcutLayer />

              <Stack>
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    animation: "fade",
                    contentStyle: { backgroundColor: "#07090B" },
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="article/[id]"
                  options={{
                    animation: "slide_from_right",
                    animationDuration: 260,
                    contentStyle: { backgroundColor: "#07090B" },
                    gestureEnabled: true,
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="interests"
                  options={{
                    animation: "slide_from_bottom",
                    animationDuration: 260,
                    contentStyle: { backgroundColor: "#07090B" },
                    headerShown: false,
                    presentation: "modal",
                  }}
                />

                <Stack.Screen
                  name="auth"
                  options={{
                    animation: "slide_from_bottom",
                    animationDuration: 260,
                    contentStyle: { backgroundColor: "#07090B" },
                    headerShown: false,
                    presentation: "modal",
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
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryProvider>
  );
}