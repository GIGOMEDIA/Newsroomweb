import { Platform } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ONE_DAY,
      networkMode: 'offlineFirst',
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 5 * ONE_MINUTE,
    },
    mutations: {
      networkMode: 'online',
      retry: 0,
    },
  },
});

// ✅ Only create persister on native (NOT web / SSR)
let queryPersister: any = undefined;

if (Platform.OS !== 'web') {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  queryPersister = createAsyncStoragePersister({
    key: 'crednews:tanstack-query-cache',
    storage: AsyncStorage,
    throttleTime: 1000,
  });
}

// ✅ Export safely
export const queryPersistOptions = queryPersister
  ? {
      buster: 'v1',
      maxAge: ONE_DAY * 7,
      persister: queryPersister,
    }
  : undefined;

// (unchanged)
export const queryKeys = {
  ai: {
    brief: (articleId: string) => ['ai', 'brief', articleId] as const,
  },
  events: {
    list: (filters: {
      city: string;
      country: string;
      timeRange: string;
      type: string;
      query?: string;
    }) =>
      [
        'events',
        filters.city.toLowerCase(),
        filters.country.toLowerCase(),
        filters.timeRange,
        filters.type,
        filters.query?.trim().toLowerCase() ?? '',
      ] as const,
  },
  news: {
    headlines: (category: string) => ['news', 'headlines', category] as const,
    personalized: (query: string) => ['news', 'personalized', query] as const,
    search: (query: string) =>
      ['news', 'search', query.trim().toLowerCase()] as const,
  },
};