import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { Article } from '@/types/article';
import { openArticle } from '@/utils/articleNavigation';
import { formatStoryDate } from '@/utils/date';
import { fontFamily } from '@/utils/typography';

import { BookmarkButton } from './BookmarkButton';
import { StoryMeta } from './StoryMeta';

type BookmarkHandler = (article: Article, event: GestureResponderEvent) => void;

/**
 * 🚨 FIX: Dummy context menu (prevents crash)
 */
const useAppContextMenu = () => ({
  showMenu: () => {},
});
const copyText = async () => {};
const getContextPoint = () => ({ x: 0, y: 0 });

function useEntranceAnimation(index: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        delay: index * 55,
        duration: 300,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        delay: index * 55,
        duration: 300,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return { opacity, translateY };
}

export function LeadArticleCard({
  article,
  isBookmarked,
  onToggleBookmark,
}: {
  article: Article;
  isBookmarked: boolean;
  onToggleBookmark: BookmarkHandler;
}) {
  const { opacity, translateY } = useEntranceAnimation(0);
  const { showMenu } = useAppContextMenu();
  const layout = useAdaptiveLayout();

  const contextProps =
    Platform.OS === 'web'
      ? {
          onContextMenu: (event: any) => {
            event.preventDefault?.();
            showMenu({});
          },
        }
      : {};

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        {...contextProps}
        style={styles.leadCard}
        onPress={() => openArticle(article)}
      >
        <Image source={{ uri: article.imageUrl }} style={styles.leadImage} />
        <View style={styles.leadContent}>
          <Text style={styles.leadTitle}>{article.title}</Text>
          <StoryMeta
            publishedAt={article.publishedAt}
            source={article.source.name}
            variant="lead"
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function FeedArticleCard({
  article,
  index,
  isBookmarked,
  onToggleBookmark,
}: {
  article: Article;
  index: number;
  isBookmarked: boolean;
  onToggleBookmark: BookmarkHandler;
}) {
  const { opacity, translateY } = useEntranceAnimation(index + 1);
  const { showMenu } = useAppContextMenu();

  const contextProps =
    Platform.OS === 'web'
      ? {
          onContextMenu: (event: any) => {
            event.preventDefault?.();
            showMenu({});
          },
        }
      : {};

  return (
    <Animated.View
      style={[styles.gridCell, { opacity, transform: [{ translateY }] }]}
    >
      <Pressable
        {...contextProps}
        style={styles.articleCard}
        onPress={() => openArticle(article)}
      >
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.articleImage}
        />

        <View style={styles.cardBody}>
          <StoryMeta
            publishedAt={article.publishedAt}
            source={article.source.name}
            variant="compact"
          />
          <Text style={styles.articleTitle}>{article.title}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  articleCard: {
    backgroundColor: '#0B0D10',
    borderColor: '#191B20',
    borderWidth: 1,
    flex: 1,
  },
  articleImage: {
    backgroundColor: '#17191D',
    height: 100,
    width: '100%',
  },
  articleTitle: {
    color: '#F0F0F2',
    fontFamily: fontFamily.bold,
    fontSize: 12,
    marginTop: 5,
  },
  cardBody: {
    padding: 8,
  },
  gridCell: {
    flex: 1,
    padding: 5,
  },
  leadCard: {
    backgroundColor: '#111318',
    borderColor: '#1D2026',
    borderWidth: 1,
    height: 220,
    marginBottom: 12,
  },
  leadContent: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  leadImage: {
    height: '100%',
    width: '100%',
  },
  leadTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
});