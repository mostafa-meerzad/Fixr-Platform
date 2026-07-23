import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, IconSize } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'dark' | 'success';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  style?: ViewStyle;
}

const variantMap: Record<ButtonVariant, { bg: string; border?: string; text: string }> = {
  primary:     { bg: Colors.primary600,                           text: Colors.white      },
  secondary:   { bg: Colors.white,   border: Colors.primary600,  text: Colors.primary600 },
  destructive: { bg: Colors.danger100,                           text: Colors.danger600  },
  ghost:       { bg: 'transparent',                              text: Colors.primary600 },
  dark:        { bg: Colors.dark,                                text: Colors.white      },
  success:     { bg: Colors.success700,                          text: Colors.white      },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantMap[variant];
  const iconColor = isDisabled ? Colors.gray400 : v.text;

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
          color={['primary', 'dark', 'success'].includes(variant) ? Colors.white : Colors.primary600}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon ? (
            <MaterialCommunityIcons name={leftIcon as any} size={IconSize.btn} color={iconColor} />
          ) : null}
          <Text style={[styles.text, { color: v.text }, isDisabled ? styles.disabledText : null]}>
            {label}
          </Text>
        </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
