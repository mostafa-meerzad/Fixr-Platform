import React from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { Text } from './Text';
import { useRTL } from '../../hooks/useRTL';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: Props) {
  const { textAlign, isRTL } = useRTL();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text variant="xs" style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { textAlign },
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.textMuted}
        selectionColor={Colors.primary}
        {...props}
      />
      {error && <Text variant="xs" color={Colors.danger} style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { gap: Spacing.xs },
  label:      { color: Colors.textSecondary, marginBottom: 2 },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  inputError:  { borderColor: Colors.danger },
  errorText:   { marginTop: 2 },
});
