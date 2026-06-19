import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface Props extends ViewProps {
  padding?: keyof typeof Spacing | number;
  variant?: 'default' | 'alt';
}

export function Card({ padding = 'lg', variant = 'default', style, children, ...props }: Props) {
  const p = typeof padding === 'number' ? padding : Spacing[padding];
  return (
    <View
      style={[
        styles.card,
        variant === 'alt' && styles.alt,
        { padding: p },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
  },
  alt: {
    backgroundColor: Colors.bgCardAlt,
  },
});
