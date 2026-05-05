import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export type AdaptiveLayout = {
  cardImageHeight: number;
  contentMaxWidth: number;
  feedColumns: number;
  feedGutter: number;
  height: number;
  isCompact: boolean;
  isDesktopLike: boolean;
  isMedium: boolean;
  isNativeMobile: boolean;
  isWide: boolean;
  leadCardHeight: number;
  scale: number;
  topNavHeight: number;
  usesTopNav: boolean;
  width: number;
};

const MEDIUM_WIDTH = 768;
const WIDE_WIDTH = 1200;
const TOP_NAV_HEIGHT = 56;

export function useAdaptiveLayout(): AdaptiveLayout {
  const { height, width } = useWindowDimensions();

  return useMemo(() => {
    const isCompact = width < MEDIUM_WIDTH;
    const isWide = width >= WIDE_WIDTH;
    const isMedium = !isCompact && !isWide;
    const isNativeMobile = Platform.OS === 'android' || Platform.OS === 'ios';
    const isDesktopLike = Platform.OS === 'web' && width >= MEDIUM_WIDTH;
    const usesTopNav = isDesktopLike;

    const contentMaxWidth = isWide ? 1100 : isMedium ? 880 : width;
    const feedGutter = isCompact
      ? 8
      : Math.max(16, Math.floor((width - contentMaxWidth) / 2));

    const scale = isWide ? 1.45 : isMedium ? 1.25 : 1;

    return {
      cardImageHeight: Math.round(96 * scale),
      contentMaxWidth,
      feedColumns: isCompact ? 2 : 3,
      feedGutter,
      height,
      isCompact,
      isDesktopLike,
      isMedium,
      isNativeMobile,
      isWide,
      leadCardHeight: isCompact
        ? 228
        : isMedium
          ? 460
          : 560,
      scale,
      topNavHeight: TOP_NAV_HEIGHT,
      usesTopNav,
      width,
    };
  }, [height, width]);
}
