import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors, FontSize } from '../../constants/theme';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}

const SIZES = { sm: FontSize.lg, md: FontSize.xl, lg: FontSize.xxl };

export function FixrLogo({ size = 'md', subtitle }: Props) {
  const fontSize = SIZES[size];
  return (
    <View style={styles.row}>
      {/* fix */}
      <Text style={[styles.fix, { fontSize }]}>fix</Text>
      {/* r — teal accent */}
      <Text style={[styles.r, { fontSize }]}>r</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { fontSize: fontSize * 0.55 }]}> {subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'baseline' },
  fix:      { fontWeight: '700', color: Colors.textPrimary },
  r:        { fontWeight: '700', color: Colors.primary },
  subtitle: { fontWeight: '400', color: Colors.textSecondary },
});
