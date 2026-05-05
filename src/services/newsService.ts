import { newsApi, NewsApiError } from '@/api/newsApi';
import { ArticleCollection, NewsCategory } from '@/types/article';

export type FetchNewsOptions = {
  signal?: AbortSignal;
};

/**
 * Maps an error from the news layer into a user-facing message. 401/403 and
 * 429 get specialized strings (auth vs throttle) so users get an actionable
 * hint; everything else falls through to the original message or a generic
 * fallback.
 */
export const newsErrorMessage = (error: unknown): string => {
  if (error instanceof NewsApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'News API access failed. Please check your API key.';
    }

    if (error.status === 429) {
      return 'News API rate limit reached. Please try again later.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load news right now.';
};

export const newsService = {
  /** Fetches headlines for a category, defaulting to 'general'. Forwards an
   * optional AbortSignal so React Query can cancel stale requests. */
  getTopHeadlines(
    category: NewsCategory = 'general',
    options?: FetchNewsOptions,
  ): Promise<ArticleCollection> {
    return newsApi.getTopHeadlines(category, options);
  },

  /**
   * Searches articles by query string. Trims input and rejects anything
   * shorter than 2 chars before hitting the network — GNews returns noisy
   * results for 1-character queries and the rate limit is precious.
   */
  searchArticles(
    query: string,
    options?: FetchNewsOptions,
  ): Promise<ArticleCollection> {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      throw new NewsApiError('Enter at least 2 characters to search news.');
    }

    return newsApi.searchArticles(trimmedQuery, options);
  },
};
