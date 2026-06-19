import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

type BadgeVariant = 'emergency' | 'today' | 'bidSent' | 'active' | 'done' | 'default';

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  emergency: { bg: Colors.primaryMuted,    text: Colors.primary },
  today:     { bg: 'rgba(245,166,35,0.15)', text: Colors.statusToday },
  bidSent:   { bg: 'rgba(245,222,179,0.15)', text: Colors.statusBidSentText },
  active:    { bg: Colors.statusActive,    text: Colors.primary },
  done:      { bg: Colors.statusDone,      text: Colors.textSecondary },
  default:   { bg: Colors.bgCardAlt,       text: Colors.textSecondary },
};

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: Props) {
  const { bg, text } = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
