import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { Colors, Radius, Spacing } from '@/constants/theme';

const SPLASH_MS = 1500;

export default function Index() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuthStore();
  const [animDone, setAnimDone] = useState(false);

  const iconScale = useRef(new Animated.Value(0.75)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    // Phase 1: icon breathes in
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Phase 2: wordmark + tagline settle in after icon
    const wordmarkTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
      ]).start();
    }, 250);

    const doneTimer = setTimeout(() => setAnimDone(true), SPLASH_MS);

    return () => {
      clearTimeout(wordmarkTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (!animDone || isLoading) return;
    if (!user) router.replace('/(auth)/phone');
    else if (user.role === 'HOMEOWNER') router.replace('/(homeowner)/home');
    else router.replace('/(expert)/browse');
  }, [animDone, isLoading, user]);

  return (
    <View style={styles.container}>
      {/* Decorative background circles */}
      <View style={[styles.bgCircle, styles.bgCircleTop]} />
      <View style={[styles.bgCircle, styles.bgCircleBottom]} />

      {/* Center content */}
      <View style={styles.center}>
        <Animated.View style={[styles.iconBox, { transform: [{ scale: iconScale }] }]}>
          <MaterialIcons name="build" size={48} color={Colors.primary600} />
          <View style={styles.iconDot} />
        </Animated.View>

        <Animated.View
          style={[
            styles.textGroup,
            { opacity: textOpacity, transform: [{ translateY: textY }] },
          ]}
        >
          <Text style={styles.wordmark}>{t('auth.phone.wordmark')}</Text>
          <Text style={styles.tagline}>{t('auth.phone.tagline')}</Text>
        </Animated.View>
      </View>

      {/* Bottom: dots + city label */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotInactive]} />
        </View>
        <Text style={styles.city}>{t('common.splash.city')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bgCircleTop: {
    top: -100,
    right: -80,
  },
  bgCircleBottom: {
    bottom: -100,
    left: -80,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.s4,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary600,
  },
  textGroup: {
    alignItems: 'center',
    gap: Spacing.s2,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -1,
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.1,
  },
  bottom: {
    position: 'absolute',
    bottom: Spacing.s10,
    alignItems: 'center',
    gap: Spacing.s2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  city: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Inter_600SemiBold',
  },
});
