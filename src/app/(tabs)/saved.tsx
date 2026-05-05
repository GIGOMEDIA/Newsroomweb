import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleListCard } from '@/components/ArticleListCard';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { useKeyboardShortcuts } from '@/hooks/platform/useKeyboardShortcuts';
import { bookmarkService } from '@/services/bookmarkService';
import { Article } from '@/types/article';
import { fontFamily } from '@/utils/typography';

export default function SavedScreen() {
  const layout = useAdaptiveLayout();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const checkOfflineState = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      await fetch('https://www.google.com/generate_204', {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    const bookmarks = await bookmarkService.getBookmarks();
    setArticles(bookmarks);
    void checkOfflineState();
  }, [checkOfflineState]);

  useKeyboardShortcuts(
    useMemo(
      () => ({
        refresh: () => {
          void loadBookmarks();
        },
      }),
      [loadBookmarks],
    ),
  );

  useFocusEffect(
    useCallback(() => {
      void loadBookmarks();
    }, [loadBookmarks]),
  );

  const removeBookmark = async (articleId: string) => {
    const nextArticles = await bookmarkService.removeBookmark(articleId);
    setArticles(nextArticles);
  };

  const clearBookmarks = async () => {
    await bookmarkService.clearBookmarks();
    setArticles([]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View
          style={[
            styles.header,
            layout.usesTopNav && styles.desktopConstrained,
            { maxWidth: layout.contentMaxWidth },
          ]}
        >
          <View>
            <Text style={styles.kicker}>LIBRARY</Text>
            <Text style={styles.heading}>Saved Articles</Text>
            <Text style={styles.count}>
              {articles.length} {articles.length === 1 ? 'article' : 'articles'} saved on this device
            </Text>
          </View>

          <Pressable
            disabled={articles.length === 0}
            style={[
              styles.clearButton,
              articles.length === 0 && styles.clearButtonDisabled,
            ]}
            onPress={clearBookmarks}
          >
            <Feather color="#A5A5AE" name="trash-2" size={12} />
            <Text style={styles.clearText}>CLEAR ALL</Text>
          </Pressable>
        </View>

        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Feather color="#F0CED0" name="wifi-off" size={13} />
            <Text style={styles.offlineText}>
              Offline mode. Saved articles are available from this device.
            </Text>
          </View>
        ) : null}

        <FlashList
          contentContainerStyle={[
            styles.listContent,
            layout.usesTopNav && styles.desktopConstrained,
            { maxWidth: layout.contentMaxWidth },
          ]}
          data={articles}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather color="#74747E" name="bookmark" size={24} />
              <Text style={styles.emptyTitle}>NO SAVED ARTICLES</Text>
              <Text style={styles.emptyCopy}>
                Tap a bookmark on any story to save it for offline reading.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ArticleListCard
              article={item}
              index={index}
              isBookmarked
              variant="saved"
              onBookmarkPress={(article, event) => {
                event.stopPropagation();
                void removeBookmark(article.id);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    borderColor: '#202229',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    height: 33,
    paddingHorizontal: 12,
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  clearText: {
    color: '#A5A5AE',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  count: {
    color: '#85858F',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    marginTop: 3,
  },
  desktopConstrained: {
    alignSelf: 'center',
    width: '100%',
  },
  emptyCopy: {
    color: '#787883',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    marginTop: 14,
  },
  header: {
    alignItems: 'flex-end',
    borderBottomColor: '#1B1D22',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 27,
    lineHeight: 32,
  },
  kicker: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    marginBottom: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  offlineBanner: {
    alignItems: 'center',
    backgroundColor: '#2E1A1F',
    borderColor: '#4B2428',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  offlineText: {
    color: '#F0CED0',
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    backgroundColor: '#07090B',
    flex: 1,
  },
});
