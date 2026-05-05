import { router } from 'expo-router';

import { Article } from '@/types/article';

/**
 * Navigates to the article detail screen, flattening the Article object into
 * route params (Expo Router only supports string/number scalars in `params`,
 * so nested fields like `source` are projected to their primitive form).
 * `imageUrl` is coerced to '' because params do not allow `undefined`.
 */
export function openArticle(article: Article) {
  router.push({
    pathname: '/article/[id]',
    params: {
      id: article.id,
      content: article.content,
      description: article.description,
      imageUrl: article.imageUrl ?? '',
      publishedAt: article.publishedAt,
      source: article.source.name,
      title: article.title,
      url: article.url,
    },
  });
}
