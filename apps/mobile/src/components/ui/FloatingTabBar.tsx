import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Colors, Radius, Spacing } from "@/constants/theme";

const BAR_HEIGHT = 64;
const HORIZONTAL_PADDING = 8; // Matches styles.bar paddingHorizontal

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // Calculate container boundaries dynamically to fit all screen sizes safely
  const paddingSides = Spacing.s4 * 2;
  const tabBarWidth = Math.min(windowWidth - paddingSides, 330);
  const activeTabWidth = tabBarWidth * 0.4; // The active tab gets 40% of the bar width
  const inactiveTabWidth =
    (tabBarWidth - activeTabWidth - HORIZONTAL_PADDING * 2) / 3; // The other 3 share the rest

  const activeIndex = state.index;
  const translateX = useSharedValue(0);

  const springConfig = {
    damping: 15,
    stiffness: 110,
    mass: 0.6,
  };

  useEffect(() => {
    let positionX = HORIZONTAL_PADDING;
    for (let i = 0; i < activeIndex; i++) {
      if (i === activeIndex - 1 || i < activeIndex) {
        positionX += state.index === i ? activeTabWidth : inactiveTabWidth;
      }
    }
    translateX.value = withSpring(positionX, springConfig);
  }, [activeIndex, activeTabWidth, inactiveTabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const activeOptions = descriptors[state.routes[activeIndex].key].options;
  const activeTabBarStyle = activeOptions.tabBarStyle as any;
  if (activeTabBarStyle?.display === 'none') return null;

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={[styles.bar, { width: tabBarWidth }]}>
        {/* The Sliding Pill Background Layer */}
        <Animated.View
          style={[
            styles.activePillBackground,
            { width: activeTabWidth },
            animatedIndicatorStyle,
          ]}
        />

        {/* Content Layers */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const renderIcon = options.tabBarIcon;

          if (!renderIcon) return null;

          const isFocused = state.index === index;
          const label = (options.title ?? route.name) as string;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              (navigation as any).navigate(route.name);
            }
          }

          const iconNode = renderIcon({
            focused: isFocused,
            color: Colors.white,
            size: 24,
          });

          // Compute individual fixed item dimensions to avoid layout jumps entirely
          const currentItemWidth = isFocused
            ? activeTabWidth
            : inactiveTabWidth;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.85}
              style={[styles.tab, { width: currentItemWidth }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            >
              <View style={styles.contentRow}>
                {iconNode}
                {isFocused && (
                  <Animated.Text style={styles.activeLabel} numberOfLines={1}>
                    {label}
                  </Animated.Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.s2,
    backgroundColor: Colors.bgApp,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark,
    borderRadius: Radius.full,
    height: BAR_HEIGHT,
    paddingHorizontal: HORIZONTAL_PADDING,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  activePillBackground: {
    position: "absolute",
    left: 0, // Root offset handles by translateX calculation logic
    backgroundColor: Colors.primary600, // Matches your orange active tab color
    height: BAR_HEIGHT - 16,
    borderRadius: Radius.full,
  },
  tab: {
    justifyContent: "center",
    alignItems: "center",
    height: BAR_HEIGHT,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.s3,
  },
  activeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.white,
  },
});
