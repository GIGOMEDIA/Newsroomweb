import { Article, ArticleCollection, NewsCategory } from '@/types/article';
import { buildApiUrl, env } from '@/utils/env';

type GNewsSource = {
  name?: string;
  url?: string;
};

type GNewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  source?: GNewsSource;
};

type GNewsResponse = {
  totalArticles?: number;
  articles?: GNewsArticle[];
  errors?: string[];
};

type RequestOptions = {
  signal?: AbortSignal;
};

type NewsQueryOptions = RequestOptions & {
  country?: string;
  language?: string;
  max?: number;
};

export class NewsApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NewsApiError';
    this.status = status;
  }
}

const makeArticleId = (article: GNewsArticle) => {
  const uniqueValue = article.url || `${article.title}-${article.publishedAt}`;

  return encodeURIComponent(uniqueValue);
};

const normalizeArticle = (article: GNewsArticle): Article | null => {
  if (!article.title || !article.url) {
    return null;
  }

  return {
    id: makeArticleId(article),
    title: article.title,
    description: article.description ?? '',
    content: article.content ?? article.description ?? '',
    url: article.url,
    imageUrl: article.image,
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    source: {
      name: article.source?.name ?? 'Unknown source',
      url: article.source?.url,
    },
  };
};

const isArticle = (article: Article | null): article is Article => article !== null;

const buildUrl = (
  endpoint: 'top-headlines' | 'search',
  params: Record<string, string | number | undefined>,
) => {
  if (!env.apiKey) {
    throw new NewsApiError('Add your GNews API key to the .env file.');
  }

  const url = buildApiUrl(env.apiBaseUrl, endpoint);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  url.searchParams.set('apikey', env.apiKey);

  return url.toString();
};

const requestNews = async (
  endpoint: 'top-headlines' | 'search',
  params: Record<string, string | number | undefined>,
  options?: RequestOptions,
): Promise<ArticleCollection> => {
  const response = await fetch(buildUrl(endpoint, params), {
    signal: options?.signal,
  });
  const data = (await response.json()) as GNewsResponse;

  if (!response.ok) {
    throw new NewsApiError(
      data.errors?.[0] ?? 'Unable to fetch news right now.',
      response.status,
    );
  }

  return {
    articles: data.articles?.map(normalizeArticle).filter(isArticle) ?? [],
    totalArticles: data.totalArticles ?? 0,
  };
};

export const newsApi = {
  getTopHeadlines: (
    category: NewsCategory = 'general',
    options?: NewsQueryOptions,
  ) =>
    requestNews(
      'top-headlines',
      {
        category,
        country: options?.country ?? env.defaultCountry,
        lang: options?.language ?? env.defaultLanguage,
        max: options?.max ?? env.maxResults,
      },
      options,
    ),

  searchArticles: (query: string, options?: NewsQueryOptions) =>
    requestNews(
      'search',
      {
        q: query.trim(),
        country: options?.country ?? env.defaultCountry,
        lang: options?.language ?? env.defaultLanguage,
        max: options?.max ?? env.maxResults,
      },
      options,
    ),
};
