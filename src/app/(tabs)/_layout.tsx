import { Feather } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { fontFamily } from '@/utils/typography';

const tabMeta = {
  events: { icon: 'calendar', label: 'EVENTS' },
  index: { icon: 'feeds', label: 'FEEDS' },
  saved: { icon: 'bookmark', label: 'SAVED' },
  search: { icon: 'search', label: 'SEARCH' },
} as const;

const feedsIcon = require('@/assets/icons/feeds.svg');

function NewsTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const layout = useAdaptiveLayout();

  if (layout.usesTopNav) {
    return (
      <View style={[styles.topNav, { height: layout.topNavHeight }]}>
        <View style={[styles.topNavInner, { maxWidth: layout.contentMaxWidth }]}>
          <View style={styles.topNavBrand}>
            <View style={styles.topNavLogo}>
              <Text style={styles.topNavLogoText}>N</Text>
            </View>
            <View>
              <Text style={styles.topNavBrandName}>NEWSROOM</Text>
              <Text style={styles.topNavBrandSubline}>LIVE WIRE</Text>
            </View>
          </View>
          <View style={styles.topNavLinks}>
            {state.routes.map((route, index) => {
              const meta = tabMeta[route.name as keyof typeof tabMeta];
              const isFocused = state.index === index;
              const options = descriptors[route.key]?.options;

              const onPress = () => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: 'tabPress',
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <TopNavButton
                  key={route.key}
                  accessibilityLabel={options?.tabBarAccessibilityLabel}
                  icon={meta.icon}
                  isFocused={isFocused}
                  label={meta.label}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.tabBar,
        { height: 78 + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = tabMeta[route.name as keyof typeof tabMeta];
        const isFocused = state.index === index;
        const options = descriptors[route.key]?.options;

        const onPress = () => {
          const event = navigation.emit({
            canPreventDefault: true,
            target: route.key,
            type: 'tabPress',
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <AnimatedTabButton
            key={route.key}
            accessibilityLabel={options?.tabBarAccessibilityLabel}
            icon={meta.icon}
            isFocused={isFocused}
            label={meta.label}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

type AnimatedTabButtonProps = {
  accessibilityLabel?: string;
  icon: keyof typeof Feather.glyphMap | 'feeds';
  isFocused: boolean;
  label: string;
  onPress: () => void;
};

function AnimatedTabButton({
  accessibilityLabel,
  icon,
  isFocused,
  label,
  onPress,
}: AnimatedTabButtonProps) {
  const progress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 220,
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isFocused, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const ruleScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1],
  });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      style={styles.tabItem}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {icon === 'feeds' ? (
          <Image
            source={feedsIcon}
            style={[
              styles.feedsIcon,
              { tintColor: isFocused ? '#FFFFFF' : '#85858F' },
            ]}
          />
        ) : (
          <Feather
            color={isFocused ? '#FFFFFF' : '#85858F'}
            name={icon}
            size={16}
          />
        )}
      </Animated.View>
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.tabRule,
          isFocused && styles.tabRuleActive,
          {
            opacity: progress,
            transform: [{ scaleX: ruleScale }],
          },
        ]}
      />
    </Pressable>
  );
}

function TopNavButton({
  accessibilityLabel,
  icon,
  isFocused,
  label,
  onPress,
}: AnimatedTabButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      style={(state) => [
        styles.topNavItem,
        (state as { hovered?: boolean }).hovered && styles.topNavItemHover,
        state.pressed && styles.topNavItemPressed,
      ]}
      onPress={onPress}
    >
      {icon === 'feeds' ? (
        <Image
          source={feedsIcon}
          style={[
            styles.feedsIcon,
            { tintColor: isFocused ? '#FFFFFF' : '#9B9BA5' },
          ]}
        />
      ) : (
        <Feather
          color={isFocused ? '#FFFFFF' : '#9B9BA5'}
          name={icon}
          size={14}
        />
      )}
      <Text style={[styles.topNavText, isFocused && styles.topNavTextActive]}>
        {label}
      </Text>
      {isFocused ? <View style={styles.topNavRule} /> : null}
    </Pressable>
  );
}

export default function TabsLayout() {
  const layout = useAdaptiveLayout();

  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#07090B',
          paddingTop: layout.usesTopNav ? layout.topNavHeight : 0,
        },
        tabBarPosition: layout.usesTopNav ? 'top' : 'bottom',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 240,
          },
        },
      }}
      tabBar={(props) => <NewsTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="saved" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  feedsIcon: {
    height: 16,
    width: 16,
  },
  tabBar: {
    backgroundColor: '#07090B',
    borderTopColor: '#101217',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  topNav: {
    alignItems: 'center',
    backgroundColor: '#07090B',
    borderBottomColor: '#171A20',
    borderBottomWidth: 1,
    left: 0,
    paddingHorizontal: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  topNavBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  topNavBrandName: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  topNavBrandSubline: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 7,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  topNavInner: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'space-between',
    width: '100%',
  },
  topNavItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 14,
    position: 'relative',
  },
  topNavItemHover: {
    backgroundColor: '#0F1116',
  },
  topNavItemPressed: {
    backgroundColor: '#15181F',
  },
  topNavLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    height: '100%',
  },
  topNavLogo: {
    alignItems: 'center',
    backgroundColor: '#FF2635',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  topNavLogoText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  topNavRule: {
    backgroundColor: '#FF2433',
    bottom: 0,
    height: 2,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  topNavText: {
    color: '#9B9BA5',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  topNavTextActive: {
    color: '#FFFFFF',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 9,
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    color: '#85858F',
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
  },
  tabRule: {
    backgroundColor: 'transparent',
    bottom: 0,
    height: 2,
    position: 'absolute',
    width: 68,
  },
  tabRuleActive: {
    backgroundColor: '#FF2433',
  },
});
