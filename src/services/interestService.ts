import { cacheService } from './cacheService';

const INTERESTS_CACHE_KEY = 'interests';

export type InterestPreferences = {
  country: string;
  interests: string[];
};

const defaultPreferences: InterestPreferences = {
  country: 'Any country',
  interests: [],
};

export const interestService = {
  /**
   * Loads the user's saved interest preferences (country + topic list).
   * Returns the default ("Any country", no interests) when nothing has been
   * saved yet — the UI relies on this to render an empty onboarding state.
   */
  async getPreferences(): Promise<InterestPreferences> {
    const cached =
      await cacheService.get<InterestPreferences>(INTERESTS_CACHE_KEY);

    return cached?.data ?? defaultPreferences;
  },

  /**
   * Persists interest preferences with light normalization:
   *   - Trimmed; an empty country string falls back to the default.
   *   - Interests are trimmed, blanks dropped, then deduped via Set so the
   *     same topic typed twice never causes duplicate API calls downstream.
   * Returns the normalized object so the caller renders exactly what was
   * saved (instead of the raw user input).
   */
  async savePreferences(
    preferences: InterestPreferences,
  ): Promise<InterestPreferences> {
    const normalizedPreferences = {
      country: preferences.country.trim() || defaultPreferences.country,
      interests: Array.from(
        new Set(
          preferences.interests
            .map((interest) => interest.trim())
            .filter(Boolean),
        ),
      ),
    };

    await cacheService.set(INTERESTS_CACHE_KEY, normalizedPreferences);

    return normalizedPreferences;
  },
};
