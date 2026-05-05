import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}