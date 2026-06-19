import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { Text } from './Text';

interface Props extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`] as ViewStyle,
        fullWidth && styles.full,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} size="small" />
      ) : (
        <Text style={[styles.label, textStyles[variant], textStyles[`size_${size}`] as TextStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  full:     { width: '100%' },
  primary:  { backgroundColor: Colors.primary },
  outline:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  ghost:    { backgroundColor: 'transparent' },
  danger:   { backgroundColor: Colors.danger },
  disabled: { opacity: 0.45 },
  size_sm:  { paddingVertical: Spacing.xs,  paddingHorizontal: Spacing.md },
  size_md:  { paddingVertical: Spacing.sm,  paddingHorizontal: Spacing.lg },
  size_lg:  { paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xl },
  label:    { fontWeight: '600' },
});

const textStyles = StyleSheet.create({
  primary:  { color: '#fff' },
  outline:  { color: Colors.primary },
  ghost:    { color: Colors.primary },
  danger:   { color: '#fff' },
  size_sm:  { fontSize: FontSize.xs },
  size_md:  { fontSize: FontSize.sm },
  size_lg:  { fontSize: FontSize.base },
});
