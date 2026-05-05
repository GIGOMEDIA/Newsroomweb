import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheEntry<T> = {
  data: T;
  cachedAt: string;
};

/** Namespaces all keys under `crednews:` so we never collide with other apps
 * (or other libraries) writing to AsyncStorage on the same device. */
const key = (name: string) => `crednews:${name}`;

export const cacheService = {
  /**
   * Reads a cached entry by name. Returns `null` for missing keys, and also
   * for corrupted JSON — in that case the bad entry is deleted so subsequent
   * reads don't keep failing on the same payload.
   */
  async get<T>(name: string): Promise<CacheEntry<T> | null> {
    const cached = await AsyncStorage.getItem(key(name));

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as CacheEntry<T>;
    } catch {
      await AsyncStorage.removeItem(key(name));
      return null;
    }
  },

  /**
   * Wraps `data` in a `CacheEntry` with a fresh `cachedAt` ISO timestamp and
   * persists it. The wrapper lets callers reason about cache age (e.g. "show
   * stale-while-revalidate banner if older than X").
   */
  async set<T>(name: string, data: T): Promise<CacheEntry<T>> {
    const entry = {
      data,
      cachedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(key(name), JSON.stringify(entry));

    return entry;
  },

  /** Deletes a single cache entry by name. No-op if the key doesn't exist. */
  async remove(name: string): Promise<void> {
    await AsyncStorage.removeItem(key(name));
  },

  /**
   * Clears every cache entry whose key starts with `crednews:news:`. Used to
   * invalidate all news lists in one shot (e.g. when the user changes country
   * or interest preferences) without touching bookmarks, comments, etc.
   */
  async clearNewsCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const newsKeys = keys.filter((storageKey) =>
      storageKey.startsWith(key('news:')),
    );

    await Promise.all(
      newsKeys.map((storageKey) => AsyncStorage.removeItem(storageKey)),
    );
  },
};
