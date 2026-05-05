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
        <Pressable style={styles.interestButton} onPress={onSelectInterests}>
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
  const errorMessage = headlinesQuery.isError
    ? newsErrorMessage(headlinesQuery.error)
    : undefined;

  const loadBookmarks = useCallback(async () => {
    const bookmarks = await bookmarkService.getBookmarks();
    setBookmarkedIds(new Set(bookmarks.map((a) => a.id)));
  }, []);

  const loadPreferences = useCallback(async () => {
    const next = await interestService.getPreferences();
    setPreferences(next);
  }, []);

  const refreshHeadlines = useCallback(async () => {
    await Promise.all([headlinesQuery.refetch(), loadBookmarks()]);
  }, [headlinesQuery, loadBookmarks]);

  useKeyboardShortcuts({
    refresh: () => {
      void refreshHeadlines();
    },
  });

  useFocusEffect(
    useCallback(() => {
      void loadBookmarks();
      void loadPreferences();
    }, [loadBookmarks, loadPreferences]),
  );

  const handleToggleBookmark = useCallback(
    async (article: Article, event: GestureResponderEvent) => {
      event.stopPropagation();
      const next = await bookmarkService.toggleBookmark(article);
      setBookmarkedIds(new Set(next.map((i) => i.id)));
    },
    [],
  );

  const articles = useMemo<Article[]>(
    () =>
      (headlinesQuery.data?.articles ?? []).map((a, i) => ({
        ...a,
        id: a.id || a.url || String(i), // 🔥 CRITICAL FIX
      })),
    [headlinesQuery.data],
  );

  const leadArticle = articles.length > 0 ? articles[0] : undefined;
  const gridArticles = articles.slice(1);

  const sectionTitle = useMemo(() => {
    const label =
      categories.find((c) => c.value === activeCategory)?.label ||
      'Top Stories';
    return label;
  }, [activeCategory]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <NewsroomHeader />

        <ScrollView horizontal style={styles.categoryScroll}>
          {categories.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setActiveCategory(c.value)}
            >
              <Text>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.feed}>
          {isLoading ? (
            <FeedSkeleton />
          ) : (
            <FlashList
              data={gridArticles}
              keyExtractor={(item, index) =>
                item?.id ?? String(index) // 🔥 FIX
              }
              renderItem={({ item, index }) =>
                item ? (
                  <FeedArticleCard
                    article={item}
                    index={index}
                    isBookmarked={bookmarkedIds.has(item.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ) : null
              }
              ListHeaderComponent={
                <FeedHeader
                  article={leadArticle}
                  bookmarkedIds={bookmarkedIds}
                  sectionTitle={sectionTitle}
                  onToggleBookmark={handleToggleBookmark}
                />
              }
              ListFooterComponent={
                <FeedFooter
                  onSelectInterests={() => setInterestsOpen(true)}
                />
              }
            />
          )}
        </View>
      </View>

      <InterestsModal
        visible={interestsOpen}
        onClose={() => setInterestsOpen(false)}
        onSaved={() => loadPreferences()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07090B' },
  screen: { flex: 1 },
  feed: { flex: 1 },
  feedHeader: { padding: 10 },
  sectionHeader: { marginBottom: 10 },
  sectionKicker: { color: 'red' },
  sectionTitle: { color: '#fff' },
  categoryScroll: { padding: 10 },
  footerPanel: { padding: 10 },
  footerDivider: { height: 1, backgroundColor: '#333' },
  footerMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  interestButton: { flexDirection: 'row', gap: 5 },
  interestText: { color: '#fff' },
  copyright: { color: '#888' },
  poweredBy: { textAlign: 'center', color: '#777' },
});