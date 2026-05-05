import { Image } from 'expo-image';
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
import { Article } from '@/types/article';
import { openArticle } from '@/utils/articleNavigation';
import { fontFamily } from '@/utils/typography';

import { BookmarkButton } from './BookmarkButton';
import { StoryMeta } from './StoryMeta';

type ArticleListCardProps = {
  article: Article;
  index: number;
  isBookmarked: boolean;
  onBookmarkPress: (article: Article, event: GestureResponderEvent) => void;
  variant?: 'search' | 'saved';
};

export function ArticleListCard({
  article,
  index,
  isBookmarked,
  onBookmarkPress,
  variant = 'search',
}: ArticleListCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const isSaved = variant === 'saved';
  const { showMenu } = useAppContextMenu();
  const contextProps =
    Platform.OS === 'web'
      ? ({
          onContextMenu: (event: unknown) => {
            const nativeEvent = event as { preventDefault?: () => void };
            nativeEvent.preventDefault?.();
            const point = getContextPoint(event);
            showMenu({
              ...point,
              items: [
                { label: 'Open article', onPress: () => openArticle(article) },
                {
                  label: isBookmarked ? 'Remove from saved' : 'Save article',
                  onPress: () =>
                    onBookmarkPress(article, {
                      stopPropagation: () => undefined,
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        delay: index * 65,
        duration: 320,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        delay: index * 65,
        duration: 320,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        {...contextProps}
        style={(state) => [
          styles.card,
          (state as { hovered?: boolean }).hovered && styles.cardHover,
          state.pressed && styles.cardPressed,
        ]}
        onPress={() => openArticle(article)}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: article.imageUrl }}
            style={[styles.image, isSaved && styles.savedImage]}
          />
          <BookmarkButton
            iconSize={isSaved ? 14 : 12}
            isBookmarked={isBookmarked}
            size={isSaved ? 28 : 24}
            style={[styles.bookmarkButton, isSaved && styles.savedBookmark]}
            onPress={(event) => onBookmarkPress(article, event)}
          />
        </View>

        <View style={[styles.cardBody, isSaved && styles.savedCardBody]}>
          <StoryMeta
            clockSize={isSaved ? 11 : 10}
            publishedAt={article.publishedAt}
            source={article.source.name}
            sourceMaxWidth={isSaved ? 132 : 144}
            timeStyle={isSaved && styles.savedTime}
          />
          <Text
            numberOfLines={2}
            style={[styles.title, isSaved && styles.savedTitle]}
          >
            {article.title}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.description, isSaved && styles.savedDescription]}
          >
            {article.description || article.content || article.source.name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bookmarkButton: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  card: {
    backgroundColor: '#0B0D10',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHover: {
    borderColor: '#343842',
    transform: [{ translateY: -1 }],
  },
  cardPressed: {
    opacity: 0.86,
  },
  cardBody: {
    paddingBottom: 12,
    paddingHorizontal: 10,
    paddingTop: 9,
  },
  description: {
    color: '#85858F',
    fontFamily: fontFamily.regular,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 5,
  },
  image: {
    backgroundColor: '#17191D',
    height: 185,
    width: '100%',
  },
  imageWrap: {
    position: 'relative',
  },
  savedBookmark: {
    right: 10,
    top: 10,
  },
  savedCardBody: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  savedDescription: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 7,
  },
  savedImage: {
    height: 214,
  },
  savedTime: {
    fontSize: 10,
  },
  savedTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
    marginTop: 5,
  },
});
