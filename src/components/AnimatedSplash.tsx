import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

const LOGO = require('@/assets/images/logo.png');

type Props = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const wireWidth = useRef(new Animated.Value(0)).current;
  const wireOpacity = useRef(new Animated.Value(0)).current;
  const sweepX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          duration: 380,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          duration: 480,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wireOpacity, {
          duration: 120,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(wireWidth, {
          duration: 520,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(sweepX, {
          delay: 60,
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(280),
      Animated.parallel([
        Animated.timing(containerOpacity, {
          duration: 320,
          easing: Easing.in(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          duration: 320,
          easing: Easing.in(Easing.cubic),
          toValue: 1.04,
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });
  }, [
    containerOpacity,
    logoOpacity,
    logoScale,
    onFinish,
    sweepX,
    wireOpacity,
    wireWidth,
  ]);

  const wireWidthInterpolated = wireWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '78%'],
  });

  const sweepTranslate = sweepX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-220, 220],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { opacity: containerOpacity }]}
    >
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          contentFit="contain"
          source={LOGO}
          style={styles.logo}
        />
        <Animated.View
          style={[styles.sweep, { transform: [{ translateX: sweepTranslate }] }]}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.wireTrack,
          {
            opacity: wireOpacity,
          },
        ]}
      >
        <Animated.View
          style={[styles.wireFill, { width: wireWidthInterpolated }]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#07090B',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  logo: {
    height: 96,
    width: 260,
  },
  logoWrap: {
    overflow: 'hidden',
  },
  sweep: {
    backgroundColor: 'rgba(255, 38, 53, 0.22)',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 90,
  },
  wireFill: {
    backgroundColor: '#FF2635',
    height: '100%',
  },
  wireTrack: {
    backgroundColor: '#17191D',
    height: 2,
    marginTop: 22,
    overflow: 'hidden',
    width: 260,
  },
});
