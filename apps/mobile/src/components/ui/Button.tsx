import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const variantMap: Record<ButtonVariant, { bg: string; border?: string; text: string }> = {
  primary:     { bg: Colors.primary600,                           text: Colors.white   },
  secondary:   { bg: Colors.white,   border: Colors.primary600,  text: Colors.primary600 },
  destructive: { bg: Colors.danger100,                           text: Colors.danger600  },
  ghost:       { bg: 'transparent',                              text: Colors.primary600 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantMap[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
        isDisabled ? styles.disabledContainer : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.white : Colors.primary600}
        />
      ) : (
        <Text style={[styles.text, { color: v.text }, isDisabled ? styles.disabledText : null]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s6,
    width: '100%',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabledContainer: {
    backgroundColor: Colors.gray200,
    borderColor: Colors.gray200,
  },
  disabledText: {
    color: Colors.gray400,
  },
});
