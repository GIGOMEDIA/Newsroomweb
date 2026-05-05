import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  FeedArticleCard,
  FeedSkeleton,
  LeadArticleCard,
} from '@/components/FeedArticleCards';
import { InterestsModal } from '@/components/InterestsModal';
import { NewsroomHeader } from '@/components/NewsroomHeader';
import {
  newsErrorMessage,
  useHeadlinesQuery,
} from '@/hooks/queries/useNewsQueries';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { useKeyboardShortcuts } from '@/hooks/platform/useKeyboardShortcuts';
import { bookmarkService } from '@/services/bookmarkService';
import {
  InterestPreferences,
  interestService,
} from '@/services/interestService';
import { Article, NewsCategory } from '@/types/article';
import { fontFamily } from '@/utils/typography';

const categories: { label: string; value: NewsCategory }[] = [
  { label: 'TOP STORIES', value: 'general' },
  { label: 'BUSINESS', value: 'business' },
  { label: 'TECHNOLOGY', value: 'technology' },
  { label: 'WORLD', value: 'world' },
  { label: 'SPORTS', value: 'sports' },
  { label: 'HEALTH', value: 'health' },
];

function FeedHeader({
  article,
  bookmarkedIds,
  sectionTitle,
  onToggleBookmark,
}: {
  article?: Article;
  bookmarkedIds: Set<string>;
  sectionTitle: string;
  onToggleBookmark: (article: Article, event: GestureResponderEvent) => void;
}) {
  return (
    <View style={styles.feedHeader}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionKicker}>SECTION</Text>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      </View>
      {article ? (
        <LeadArticleCard
          article={article}
          isBookmarked={bookmarkedIds.has(article.id)}
          onToggleBookmark={onToggleBookmark}
        />
      ) : null}
    </View>
  );
}

function FeedFooter({ onSelectInterests }: { onSelectInterests: () => void }) {
  return (
    <View style={styles.footerPanel}>
      <View style={styles.footerDivider} />
      <View style={styles.footerMetaRow}>
        <Text style={styles.copyright}>(c) 2026 NEWSROOM</Text>
        <Pressable
          style={styles.interestButton}
          onPress={onSelectInterests}
        >
          <Ionicons color="#F0CED0" name="sparkles-outline" size={12} />
          <Text style={styles.interestText}>SELECT INTERESTS</Text>
        </Pressable>
      </View>
      <Text style={styles.poweredBy}>POWERED BY GNEWS</Text>
    </View>
  );
}

export default function HomeScreen() {
  const layout = useAdaptiveLayout();
  const [activeCategory, setActiveCategory] =
    useState<NewsCategory>('general');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [preferences, setPreferences] = useState<InterestPreferences>({
    country: 'Any country',
    interests: [],
  });

  const personalizedQuery = preferences.interests.join(' ');
  const headlinesQuery = useHeadlinesQuery(activeCategory, personalizedQuery);
  const isLoading = headlinesQuery.isFetching;
  const isStaleFromCache =
    Boolean(headlinesQuery.data) && headlinesQuery.isError;
  const errorMessage = headlinesQuery.isError
    ? newsErrorMessage(headlinesQuery.error)
    : undefined;

  const loadBookmarks = useCallback(async () => {
    const bookmarks = await bookmarkService.getBookmarks();
    setBookmarkedIds(new Set(bookmarks.map((article) => article.id)));
  }, []);

  const loadPreferences = useCallback(async () => {
    const nextPreferences = await interestService.getPreferences();
    setPreferences(nextPreferences);

    return nextPreferences;
  }, []);

  const refreshHeadlines = useCallback(async () => {
    await loadPreferences();
    await Promise.all([headlinesQuery.refetch(), loadBookmarks()]);
  }, [headlinesQuery, loadBookmarks, loadPreferences]);

  useKeyboardShortcuts(
    useMemo(
      () => ({
        refresh: () => {
          void refreshHeadlines();
        },
      }),
      [refreshHeadlines],
    ),
  );

  useFocusEffect(
    useCallback(() => {
      void loadBookmarks();
      void loadPreferences();
    }, [loadBookmarks, loadPreferences]),
  );

  const handleToggleBookmark = useCallback(
    async (article: Article, event: GestureResponderEvent) => {
      event.stopPropagation();
      const nextBookmarks = await bookmarkService.toggleBookmark(article);
      setBookmarkedIds(new Set(nextBookmarks.map((item) => item.id)));
    },
    [],
  );

  const articles = useMemo<Article[]>(
    () => headlinesQuery.data?.articles ?? [],
    [headlinesQuery.data],
  );
  const leadArticle = articles[0];
  const gridArticles = useMemo(() => articles.slice(1), [articles]);
  const sectionTitle = useMemo(() => {
    if (activeCategory === 'general' && preferences.interests.length > 0) {
      return 'Your Interests';
    }
    const label =
      categories.find((category) => category.value === activeCategory)?.label ??
      'Top Stories';
    return label.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [activeCategory, preferences.interests.length]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <NewsroomHeader />

        <View
          style={[
            styles.categoryBand,
            layout.usesTopNav && styles.categoryBandCentered,
            layout.usesTopNav && { maxWidth: layout.contentMaxWidth },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((category) => {
              const isActive = category.value === activeCategory;

              return (
                <Pressable
                  key={category.value}
                  style={styles.categoryItem}
                  onPress={() => setActiveCategory(category.value)}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      isActive && styles.categoryLabelActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                  <View
                    style={[
                      styles.categoryUnderline,
                      isActive && styles.categoryUnderlineActive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.feed}>
          {isLoading ? (
            <FeedSkeleton />
          ) : (
            <>
              {errorMessage ? (
                <View style={styles.inlineNotice}>
                  <Text style={styles.inlineNoticeText}>
                    {isStaleFromCache
                      ? `Showing cached headlines. ${errorMessage}`
                      : errorMessage}
                  </Text>
                  <Pressable
                    style={styles.retryButton}
                    onPress={() => headlinesQuery.refetch()}
                  >
                    <Text style={styles.retryText}>RETRY</Text>
                  </Pressable>
                </View>
              ) : null}

              <FlashList
                contentContainerStyle={[
                  styles.feedListContent,
                  layout.usesTopNav && styles.desktopListContent,
                  { maxWidth: layout.contentMaxWidth },
                ]}
                data={gridArticles}
                key={`feed-${layout.feedColumns}`}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>NO SIGNAL YET</Text>
                    <Text style={styles.emptyCopy}>
                      Headlines will appear here when the feed is ready.
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  <FeedFooter
                    onSelectInterests={() => setInterestsOpen(true)}
                  />
                }
                ListHeaderComponent={
                  <FeedHeader
                    article={leadArticle}
                    bookmarkedIds={bookmarkedIds}
                    sectionTitle={sectionTitle}
                    onToggleBookmark={handleToggleBookmark}
                  />
                }
                numColumns={layout.feedColumns}
                onRefresh={refreshHeadlines}
                refreshing={false}
                renderItem={({ item, index }) => (
                  <FeedArticleCard
                    article={item}
                    index={index}
                    isBookmarked={bookmarkedIds.has(item.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>

      </View>
      <InterestsModal
        onClose={() => setInterestsOpen(false)}
        onSaved={() => {
          void loadPreferences();
        }}
        visible={interestsOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  categoryBand: {
    borderBottomColor: '#191B20',
    borderBottomWidth: 1,
    height: 31,
  },
  categoryBandCentered: {
    alignSelf: 'center',
    width: '100%',
  },
  categoryItem: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    marginRight: 18,
  },
  categoryLabel: {
    color: '#8C8C96',
    fontFamily: fontFamily.medium,
    fontSize: 7,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
  },
  categoryScroll: {
    paddingLeft: 8,
  },
  categoryUnderline: {
    backgroundColor: 'transparent',
    bottom: 0,
    height: 2,
    position: 'absolute',
    width: '100%',
  },
  categoryUnderlineActive: {
    backgroundColor: '#FF2635',
  },
  copyright: {
    color: '#878791',
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
  desktopListContent: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    width: '100%',
  },
  emptyCopy: {
    color: '#70707A',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 7,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  feed: {
    flex: 1,
  },
  feedHeader: {
    paddingHorizontal: 8,
  },
  feedListContent: {
    paddingBottom: 12,
  },
  footerDivider: {
    backgroundColor: '#1C1E23',
    height: 1,
    marginBottom: 17,
  },
  footerMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerPanel: {
    paddingHorizontal: 9,
    paddingTop: 22,
  },
  inlineNotice: {
    alignItems: 'center',
    borderColor: '#24262C',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    margin: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  inlineNoticeText: {
    color: '#C7C7CE',
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  interestButton: {
    alignItems: 'center',
    backgroundColor: '#3A2024',
    flexDirection: 'row',
    gap: 5,
    height: 20,
    paddingHorizontal: 7,
  },
  interestText: {
    color: '#F3D7D9',
    fontFamily: fontFamily.bold,
    fontSize: 7,
  },
  poweredBy: {
    color: '#92929B',
    fontFamily: fontFamily.medium,
    fontSize: 8,
    marginBottom: 24,
    marginTop: 26,
    textAlign: 'center',
  },
  retryButton: {
    borderColor: '#4B2428',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  retryText: {
    color: '#F0CED0',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  sectionHeader: {
    paddingBottom: 9,
    paddingTop: 12,
  },
  sectionKicker: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 7,
    marginBottom: 2,
  },
  sectionKickerSkeleton: {
    backgroundColor: '#17191D',
    height: 7,
    marginBottom: 6,
    width: 36,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 19,
  },
  sectionTitleSkeleton: {
    backgroundColor: '#17191D',
    height: 16,
    width: 92,
  },
});
