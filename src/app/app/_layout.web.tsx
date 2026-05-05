import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/queryClient';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: '#07090B' },
            }}
          />

          <Stack.Screen
            name="article/[id]"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: '#07090B' },
            }}
          />

          <Stack.Screen
            name="interests"
            options={{
              headerShown: false,
              presentation: 'modal',
              contentStyle: { backgroundColor: '#07090B' },
            }}
          />

          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
              presentation: 'modal',
              contentStyle: { backgroundColor: '#07090B' },
            }}
          />
        </Stack>

        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}