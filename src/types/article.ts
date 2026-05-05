export type NewsCategory =
  | 'general'
  | 'world'
  | 'nation'
  | 'business'
  | 'technology'
  | 'entertainment'
  | 'sports'
  | 'science'
  | 'health';

export type ArticleSource = {
  name: string;
  url?: string;
};

export type Article = {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  source: ArticleSource;
};

export type ArticleCollection = {
  articles: Article[];
  totalArticles: number;
};
