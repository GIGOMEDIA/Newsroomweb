import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 🔥 ADD THIS IMPORT (adjust path if needed)
import { AppContextMenuProvider } from "@/contexts/AppContextMenuContext";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>

        {/* 🔥 THIS FIXES YOUR CRASH */}
        <AppContextMenuProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#07090B" },
            }}
          />

          <StatusBar
            backgroundColor="#07090B"
            style="light"
            translucent={false}
          />
        </AppContextMenuProvider>

      </SafeAreaProvider>
    </QueryClientProvider>
  );
}