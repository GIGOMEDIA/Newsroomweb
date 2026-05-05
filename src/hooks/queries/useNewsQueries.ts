import { useQuery } from '@tanstack/react-query';

import { newsErrorMessage, newsService } from '@/services/newsService';
import { queryKeys } from '@/services/queryClient';
import { ArticleCollection, NewsCategory } from '@/types/article';

const FIVE_MINUTES = 5 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Fetches the home-screen articles. Two modes share this hook so the screen
 * can switch between them without re-mounting:
 *   - Personalized: when category is 'general' AND `personalizedQuery` has
 *     real content (>1 char after trim), uses `searchArticles` with the
 *     query. The `news.personalized` query key is keyed by lowercased
 *     query so case differences hit the same cache entry.
 *   - Headlines: every other case, uses `getTopHeadlines(category)`.
 *
 * 5min staleTime / 1hr gcTime keep the home feed snappy while still
 * refreshing within a session.
 */
export function useHeadlinesQuery(
  category: NewsCategory,
  personalizedQuery: string,
) {
  const trimmed = personalizedQuery.trim();
  const isPersonalized = category === 'general' && trimmed.length > 1;

  return useQuery<ArticleCollection, Error>({
    enabled: true,
    queryKey: isPersonalized
      ? queryKeys.news.personalized(trimmed.toLowerCase())
      : queryKeys.news.headlines(category),
    queryFn: ({ signal }) =>
      isPersonalized
        ? newsService.searchArticles(trimmed, { signal })
        : newsService.getTopHeadlines(category, { signal }),
    staleTime: FIVE_MINUTES,
    gcTime: FIFTEEN_MINUTES * 4,
  });
}

/**
 * Drives the search screen. Disabled (won't fire) until the trimmed query is
 * at least 2 chars — matches the same minimum enforced by `newsService.searchArticles`.
 * Cache is keyed by trimmed/lowercased query so "AI" / "ai " / "Ai" all share results.
 */
export function useSearchQuery(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  return useQuery<ArticleCollection, Error>({
    enabled,
    queryKey: queryKeys.news.search(trimmed),
    queryFn: ({ signal }) => newsService.searchArticles(trimmed, { signal }),
    staleTime: FIVE_MINUTES,
    gcTime: FIFTEEN_MINUTES * 4,
  });
}

export { newsErrorMessage };
