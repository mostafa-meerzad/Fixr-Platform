import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';

interface Props extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'sm' | 'xs' | 'label';
  color?: string;
  bold?: boolean;
  muted?: boolean;
}

export function Text({ variant = 'body', color, bold, muted, style, ...props }: Props) {
  const { textAlign } = useRTL();
  return (
    <RNText
      style={[
        styles[variant],
        { textAlign },
        bold && styles.bold,
        muted && { color: Colors.textSecondary },
        color ? { color } : null,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  h1:    { fontSize: FontSize.xxxl, fontWeight: '700', color: Colors.textPrimary },
  h2:    { fontSize: FontSize.xxl,  fontWeight: '700', color: Colors.textPrimary },
  h3:    { fontSize: FontSize.xl,   fontWeight: '600', color: Colors.textPrimary },
  body:  { fontSize: FontSize.base, fontWeight: '400', color: Colors.textPrimary },
  sm:    { fontSize: FontSize.sm,   fontWeight: '400', color: Colors.textPrimary },
  xs:    { fontSize: FontSize.xs,   fontWeight: '400', color: Colors.textSecondary },
  label: { fontSize: FontSize.xs,   fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' },
  bold:  { fontWeight: '700' },
});
