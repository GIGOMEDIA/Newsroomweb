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
import { StoryMeta } from './StoryMeta';

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
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        delay: index * 55,
        duration: 300,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return { opacity, translateY };
}

export function FeedSkeleton() {
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
      <View style={styles.sectionHeader}>
        <View style={styles.sectionKickerSkeleton} />
        <View style={styles.sectionTitleSkeleton} />
      </View>
      <Animated.View style={[styles.skeletonLead, { opacity }]} />
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Animated.View
            key={item}
            style={[styles.skeletonGridCard, { opacity }]}
          >
            <View style={styles.skeletonGridImage} />
            <View style={styles.skeletonMeta} />
            <View style={styles.skeletonTitle} />
            <View style={[styles.skeletonTitle, styles.skeletonTitleShort]} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
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
  const leadHeight = layout.leadCardHeight;
  const titleFontSize = layout.isWide ? 24 : layout.isMedium ? 20 : 15;
  const titleLineHeight = Math.round(titleFontSize * 1.2);
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
                    onToggleBookmark(article, {
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        {...contextProps}
        style={(state) => [
          styles.leadCard,
          { height: leadHeight },
          (state as { hovered?: boolean }).hovered && styles.cardHover,
          state.pressed && styles.cardPressed,
        ]}
        onPress={() => openArticle(article)}
      >
        <Image source={{ uri: article.imageUrl }} style={styles.leadImage} />
        <LinearGradient
          colors={['rgba(8,9,12,0)', 'rgba(8,9,12,0.55)', 'rgba(8,9,12,0.95)']}
          locations={[0.45, 0.75, 1]}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.leadBadges}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              {formatStoryDate(article.publishedAt)}
            </Text>
          </View>
        </View>
        <BookmarkButton
          isBookmarked={isBookmarked}
          size={22}
          style={styles.bookmarkBox}
          onPress={(event) => onToggleBookmark(article, event)}
        />
        <View style={styles.leadContent}>
          <Text
            numberOfLines={3}
            style={[
              styles.leadTitle,
              { fontSize: titleFontSize, lineHeight: titleLineHeight },
            ]}
          >
            {article.title}
          </Text>
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
  const layout = useAdaptiveLayout();
  const imageHeight = layout.cardImageHeight;
  const titleFontSize = layout.isWide ? 14 : layout.isMedium ? 13 : 11;
  const titleLineHeight = Math.round(titleFontSize * 1.25);
  const descFontSize = layout.isWide ? 11 : layout.isMedium ? 10 : 8;
  const descLineHeight = Math.round(descFontSize * 1.45);
  const minCardHeight = layout.isWide ? 270 : layout.isMedium ? 240 : 214;
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
                    onToggleBookmark(article, {
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

  return (
    <Animated.View
      style={[styles.gridCell, { opacity, transform: [{ translateY }] }]}
    >
      <Pressable
        {...contextProps}
        style={(state) => [
          styles.articleCard,
          { minHeight: minCardHeight },
          (state as { hovered?: boolean }).hovered && styles.cardHover,
          state.pressed && styles.cardPressed,
        ]}
        onPress={() => openArticle(article)}
      >
        <View style={styles.articleImageWrap}>
          <Image
            source={{ uri: article.imageUrl }}
            style={[styles.articleImage, { height: imageHeight }]}
          />
          <BookmarkButton
            iconSize={10}
            isBookmarked={isBookmarked}
            size={20}
            style={styles.cardBookmark}
            onPress={(event) => onToggleBookmark(article, event)}
          />
        </View>
        <View style={styles.cardBody}>
          <StoryMeta
            publishedAt={article.publishedAt}
            source={article.source.name}
            variant="compact"
          />
          <Text
            numberOfLines={3}
            style={[
              styles.articleTitle,
              { fontSize: titleFontSize, lineHeight: titleLineHeight },
            ]}
          >
            {article.title}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.articleDescription,
              { fontSize: descFontSize, lineHeight: descLineHeight },
            ]}
          >
            {article.description || article.source.name}
          </Text>
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
    minHeight: 214,
  },
  cardHover: {
    borderColor: '#343842',
    transform: [{ translateY: -1 }],
  },
  cardPressed: {
    opacity: 0.86,
  },
  articleDescription: {
    color: '#8D8D96',
    fontFamily: fontFamily.regular,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 5,
  },
  articleImage: {
    backgroundColor: '#17191D',
    height: 84,
    width: '100%',
  },
  articleImageWrap: {
    position: 'relative',
  },
  articleTitle: {
    color: '#F0F0F2',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 13,
    marginTop: 5,
  },
  bookmarkBox: {
    position: 'absolute',
    right: 8,
    top: 9,
  },
  cardBody: {
    paddingHorizontal: 7,
    paddingTop: 7,
  },
  cardBookmark: {
    position: 'absolute',
    right: 6,
    top: 6,
  },
  dateBadge: {
    backgroundColor: '#1B1E24',
    height: 16,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dateBadgeText: {
    color: '#D2D2D8',
    fontFamily: fontFamily.bold,
    fontSize: 6,
  },
  featuredBadge: {
    backgroundColor: '#FF2635',
    height: 16,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  featuredText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 6,
  },
  gridCell: {
    flex: 1,
    paddingBottom: 10,
    paddingHorizontal: 5,
  },
  leadBadges: {
    flexDirection: 'row',
    left: 8,
    position: 'absolute',
    top: 8,
  },
  leadCard: {
    backgroundColor: '#111318',
    borderColor: '#1D2026',
    borderWidth: 1,
    height: 228,
    marginBottom: 12,
    overflow: 'hidden',
  },
  leadContent: {
    bottom: 12,
    left: 10,
    position: 'absolute',
    right: 14,
  },
  leadImage: {
    height: '100%',
    width: '100%',
  },
  leadTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 18,
  },
  sectionHeader: {
    paddingBottom: 9,
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  sectionKickerSkeleton: {
    backgroundColor: '#17191D',
    height: 7,
    marginBottom: 6,
    width: 36,
  },
  sectionTitleSkeleton: {
    backgroundColor: '#17191D',
    height: 16,
    width: 92,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 8,
  },
  skeletonGridCard: {
    backgroundColor: '#0B0D10',
    flexBasis: '48%',
    height: 198,
    padding: 7,
  },
  skeletonGridImage: {
    backgroundColor: '#17191D',
    height: 84,
    marginBottom: 10,
    width: '100%',
  },
  skeletonLead: {
    backgroundColor: '#17191D',
    height: 228,
    marginBottom: 12,
    marginHorizontal: 8,
  },
  skeletonMeta: {
    backgroundColor: '#17191D',
    height: 7,
    marginBottom: 8,
    width: 70,
  },
  skeletonTitle: {
    backgroundColor: '#17191D',
    height: 11,
    marginBottom: 7,
    width: '92%',
  },
  skeletonTitleShort: {
    width: '62%',
  },
  skeletonWrap: {
    flex: 1,
  },
});
