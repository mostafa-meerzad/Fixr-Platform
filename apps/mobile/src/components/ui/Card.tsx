import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';

export type CardVariant = 'default' | 'emergency' | 'accepted';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', onPress, style }: CardProps) {
  const containerStyle = [
    styles.base,
    variant === 'emergency' ? styles.emergency : null,
    variant === 'accepted' ? styles.accepted : null,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    ...Shadows.sm,
  },
  emergency: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger600,
  },
  accepted: {
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary50,
  },
});
