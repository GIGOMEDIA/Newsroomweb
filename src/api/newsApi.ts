import { env } from '@/utils/env';
import { ArticleCollection, NewsCategory } from '@/types/article';

export class NewsApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NewsApiError';
    this.status = status;
  }
}

const PROXY = 'https://api.allorigins.win/raw?url=';

const fetchJson = async (url: string, signal?: AbortSignal) => {
  const proxiedUrl = PROXY + encodeURIComponent(url);

  const res = await fetch(proxiedUrl, { signal });

  if (!res.ok) {
    throw new NewsApiError('Failed to fetch news', res.status);
  }

  return res.json();
};

export const newsApi = {
  async getTopHeadlines(
    category: NewsCategory,
    options?: { signal?: AbortSignal },
  ): Promise<ArticleCollection> {
    const url = `${env.apiBaseUrl}/top-headlines?category=${category}&country=ng&apikey=${env.apiKey}`;

    return fetchJson(url, options?.signal);
  },

  async searchArticles(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<ArticleCollection> {
    const url = `${env.apiBaseUrl}/search?q=${encodeURIComponent(
      query,
    )}&lang=en&country=ng&apikey=${env.apiKey}`;

    return fetchJson(url, options?.signal);
  },
};