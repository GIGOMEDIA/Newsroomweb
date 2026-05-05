import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArticleListCard } from '@/components/ArticleListCard';
import {
  newsErrorMessage,
  useSearchQuery,
} from '@/hooks/queries/useNewsQueries';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { useKeyboardShortcuts } from '@/hooks/platform/useKeyboardShortcuts';
import { bookmarkService } from '@/services/bookmarkService';
import { Article } from '@/types/article';
import { fontFamily } from '@/utils/typography';

function SearchSkeleton() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 760,
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 760,
          toValue: 0.35,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((item) => (
        <Animated.View key={item} style={[styles.skeletonCard, { opacity }]}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonMeta} />
          <View style={styles.skeletonTitle} />
          <View style={[styles.skeletonTitle, styles.skeletonTitleShort]} />
        </Animated.View>
      ))}
    </View>
  );
}

export default function SearchScreen() {
  const layout = useAdaptiveLayout();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<TextInput>(null);

  const loadBookmarks = useCallback(async () => {
    const bookmarks = await bookmarkService.getBookmarks();
    setBookmarkedIds(new Set(bookmarks.map((article) => article.id)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBookmarks();
    }, [loadBookmarks]),
  );

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 450);
    return () => clearTimeout(timeout);
  }, [query]);

  const searchQuery = useSearchQuery(debouncedQuery);
  useKeyboardShortcuts(
    useMemo(
      () => ({
        refresh: () => {
          void searchQuery.refetch();
        },
        search: () => searchInputRef.current?.focus(),
      }),
      [searchQuery],
    ),
  );
  const trimmedQuery = query.trim();
  const articles = searchQuery.data?.articles ?? [];
  const hasResult = Boolean(searchQuery.data) || searchQuery.isError;
  const isLoading =
    debouncedQuery.length >= 2 &&
    (searchQuery.isPending ||
      (debouncedQuery !== trimmedQuery && trimmedQuery.length >= 2));
  const errorMessage = searchQuery.isError
    ? newsErrorMessage(searchQuery.error)
    : undefined;

  const handleToggleBookmark = async (
    article: Article,
    event: GestureResponderEvent,
  ) => {
    event.stopPropagation();
    const nextBookmarks = await bookmarkService.toggleBookmark(article);
    setBookmarkedIds(new Set(nextBookmarks.map((item) => item.id)));
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
          <Text style={styles.kicker}>SEARCH</Text>
          <Text style={styles.heading}>Find articles</Text>
          <View style={styles.searchBox}>
            <Feather color="#9A9AA4" name="search" size={13} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Search news"
              placeholderTextColor="#6F6F78"
              selectionColor="#FF2635"
              ref={searchInputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')}>
                <Feather color="#9A9AA4" name="x" size={13} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.resultCount}>
            {hasResult
              ? `${articles.length} RESULTS FOR "${trimmedQuery.toUpperCase()}"`
              : 'TYPE AT LEAST 2 CHARACTERS'}
          </Text>
        </View>

        {isLoading ? (
          <SearchSkeleton />
        ) : (
          <>
            {errorMessage ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{errorMessage}</Text>
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
                  <Text style={styles.emptyTitle}>
                    {trimmedQuery.length < 2 ? 'START SEARCHING' : 'NO RESULTS'}
                  </Text>
                  <Text style={styles.emptyCopy}>
                    {trimmedQuery.length < 2
                      ? 'Enter a topic, company, city, or keyword.'
                      : 'Try another keyword or check back later.'}
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <ArticleListCard
                  article={item}
                  index={index}
                  isBookmarked={bookmarkedIds.has(item.id)}
                  onBookmarkPress={handleToggleBookmark}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyCopy: {
    color: '#787883',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  desktopConstrained: {
    alignSelf: 'center',
    width: '100%',
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 31,
  },
  input: {
    color: '#FFFFFF',
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    height: 34,
    padding: 0,
  },
  kicker: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    marginBottom: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 13,
  },
  notice: {
    borderColor: '#4B2428',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: '#F0CED0',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  resultCount: {
    color: '#85858F',
    fontFamily: fontFamily.medium,
    fontSize: 8,
    marginTop: 9,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  searchBox: {
    alignItems: 'center',
    borderColor: '#5B1B22',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 34,
    marginTop: 8,
    paddingHorizontal: 9,
  },
  skeletonCard: {
    backgroundColor: '#0B0D10',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginBottom: 14,
    padding: 8,
  },
  skeletonImage: {
    backgroundColor: '#17191D',
    height: 185,
    marginBottom: 12,
    width: '100%',
  },
  skeletonMeta: {
    backgroundColor: '#17191D',
    height: 8,
    marginBottom: 9,
    width: 120,
  },
  skeletonTitle: {
    backgroundColor: '#17191D',
    height: 12,
    marginBottom: 8,
    width: '90%',
  },
  skeletonTitleShort: {
    width: '62%',
  },
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 13,
  },
});
