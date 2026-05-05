import { Article } from '@/types/article';
import { cacheService } from './cacheService';

const BOOKMARKS_CACHE_KEY = 'bookmarks';

/** Sorts articles by publishedAt descending (newest first). Mutates and
 * returns the input array — callers that need immutability should clone. */
const sortByNewest = (articles: Article[]) =>
  articles.sort(
    (first, second) =>
      new Date(second.publishedAt).getTime() -
      new Date(first.publishedAt).getTime(),
  );

export const bookmarkService = {
  /** Returns all currently bookmarked articles, or [] if nothing is cached. */
  async getBookmarks(): Promise<Article[]> {
    const cached = await cacheService.get<Article[]>(BOOKMARKS_CACHE_KEY);

    return cached?.data ?? [];
  },

  /** Returns true if the given article id is already bookmarked. */
  async isBookmarked(articleId: string): Promise<boolean> {
    const bookmarks = await this.getBookmarks();

    return bookmarks.some((article) => article.id === articleId);
  },

  /**
   * Adds an article to the bookmark list and re-sorts by newest. Idempotent:
   * if the article is already bookmarked, the existing list is returned
   * unchanged. Returns the new bookmark list so callers can update UI without
   * a follow-up read.
   */
  async addBookmark(article: Article): Promise<Article[]> {
    const bookmarks = await this.getBookmarks();
    const exists = bookmarks.some((item) => item.id === article.id);
    const nextBookmarks = exists ? bookmarks : sortByNewest([article, ...bookmarks]);

    await cacheService.set(BOOKMARKS_CACHE_KEY, nextBookmarks);

    return nextBookmarks;
  },

  /**
   * Removes a bookmark by article id. No-op (returns the existing list) if
   * the id is not in the list. Returns the new list for UI update.
   */
  async removeBookmark(articleId: string): Promise<Article[]> {
    const bookmarks = await this.getBookmarks();
    const nextBookmarks = bookmarks.filter((article) => article.id !== articleId);

    await cacheService.set(BOOKMARKS_CACHE_KEY, nextBookmarks);

    return nextBookmarks;
  },

  /** Wipes the entire bookmark list from local storage. */
  async clearBookmarks(): Promise<void> {
    await cacheService.remove(BOOKMARKS_CACHE_KEY);
  },

  /**
   * Toggles bookmark state for an article — adds if absent, removes if
   * present. Single entry point used by the UI's bookmark icon tap so the
   * caller doesn't need to know the current state.
   */
  async toggleBookmark(article: Article): Promise<Article[]> {
    const bookmarked = await this.isBookmarked(article.id);

    return bookmarked
      ? this.removeBookmark(article.id)
      : this.addBookmark(article);
  },
};
