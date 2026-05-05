import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

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

export const queryPersister = createAsyncStoragePersister({
  key: 'crednews:tanstack-query-cache',
  storage: AsyncStorage,
  throttleTime: 1000,
});

export const queryPersistOptions = {
  buster: 'v1',
  maxAge: ONE_DAY * 7,
  persister: queryPersister,
};

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
