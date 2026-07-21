import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface ProgressBarProps {
  progress?: number;       // 0–1, used directly
  currentStep?: number;   // used with totalSteps
  totalSteps?: number;
}

export function ProgressBar({ progress, currentStep, totalSteps }: ProgressBarProps) {
  const fill =
    currentStep !== undefined && totalSteps
      ? currentStep / totalSteps
      : Math.min(1, Math.max(0, progress ?? 0));

  const [containerWidth, setContainerWidth] = useState(0);
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (containerWidth === 0) return;
    Animated.timing(animWidth, {
      toValue: fill * containerWidth,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fill, containerWidth, animWidth]);

  return (
    <View
      style={styles.track}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.fill, { width: animWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    width: '100%',
    backgroundColor: Colors.sand,
  },
  fill: {
    height: 3,
    backgroundColor: Colors.primary600,
  },
});
