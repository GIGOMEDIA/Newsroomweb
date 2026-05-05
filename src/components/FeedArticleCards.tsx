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

import {
  copyText,
  getContextPoint,
  useAppContextMenu,
} from '@/components/platform/AppContextMenu';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { Article } from '@/types/article';
import { openArticle } from '@/utils/articleNavigation';
import { formatStoryDate } from '@/utils/date';
import { fontFamily } from '@/utils/typography';

import { BookmarkButton } from './BookmarkButton';

type BookmarkHandler = (article: Article, event: GestureResponderEvent) => void;

function useEntranceAnimation(index: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        delay: index * 55,
        duration: 300,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web', // ✅ FIX
      }),
      Animated.timing(translateY, {
        delay: index * 55,
        duration: 300,
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web', // ✅ FIX
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

  const contextProps =
    Platform.OS === 'web'
      ? ({
          onContextMenu: (event: any) => {
            event.preventDefault?.();
            const point = getContextPoint(event);
            showMenu({
              ...point,
              items: [
                { label: 'Open article', onPress: () => openArticle(article) },
                {
                  label: isBookmarked ? 'Remove from saved' : 'Save article',
                  onPress: () =>
                    onToggleBookmark(article, {
                      stopPropagation: () => {},
                    } as GestureResponderEvent),
                },
                {
                  disabled: !article.url,
                  label: 'Copy source link',
                  onPress: () => void copyText(article.url),
                },
              ],
            });
          },
        } as Record<string, unknown>)
      : {};

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        {...contextProps}
        style={styles.leadCard}
        onPress={() => openArticle(article)}
      >
        <Image source={{ uri: article.imageUrl }} style={styles.leadImage} />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.leadContent}>
          <Text style={styles.leadTitle} numberOfLines={3}>
            {article.title}
          </Text>

          {/* ✅ FIX: removed StoryMeta */}
          <Text style={styles.meta}>
            {article.source?.name} • {formatStoryDate(article.publishedAt)}
          </Text>
        </View>

        <BookmarkButton
          isBookmarked={isBookmarked}
          size={22}
          style={styles.bookmark}
          onPress={(e) => onToggleBookmark(article, e)}
        />
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
      ? ({
          onContextMenu: (event: any) => {
            event.preventDefault?.();
            const point = getContextPoint(event);
            showMenu({
              ...point,
              items: [
                { label: 'Open article', onPress: () => openArticle(article) },
                {
                  label: isBookmarked ? 'Remove from saved' : 'Save article',
                  onPress: () =>
                    onToggleBookmark(article, {
                      stopPropagation: () => {},
                    } as GestureResponderEvent),
                },
              ],
            });
          },
        } as Record<string, unknown>)
      : {};

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        {...contextProps}
        style={styles.card}
        onPress={() => openArticle(article)}
      >
        <Image source={{ uri: article.imageUrl }} style={styles.image} />

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={3}>
            {article.title}
          </Text>

          {/* ✅ FIX: removed StoryMeta */}
          <Text style={styles.meta}>
            {article.source?.name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leadCard: {
    height: 220,
    marginBottom: 12,
    backgroundColor: '#111',
  },
  leadImage: {
    width: '100%',
    height: '100%',
  },
  leadContent: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  leadTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontFamily.bold,
  },
  meta: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 4,
  },
  bookmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  card: {
    backgroundColor: '#0B0D10',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 100,
  },
  body: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fontFamily.bold,
  },
});