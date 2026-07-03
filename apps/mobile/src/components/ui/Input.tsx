import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type ViewStyle,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useRTL } from '@/hooks/useRTL';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  onBlur?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: ViewStyle;
  /** Force LTR text alignment regardless of language — use for phone numbers, prices, numeric codes */
  ltrText?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    placeholder,
    value,
    onChangeText,
    error,
    multiline = false,
    secureTextEntry = false,
    keyboardType = 'default',
    editable = true,
    onBlur,
    autoFocus = false,
    maxLength,
    returnKeyType,
    onSubmitEditing,
    autoCapitalize,
    style,
    ltrText = false,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const { textAlign } = useRTL();

  // Numeric/phone/OTP fields are always LTR regardless of language
  const resolvedTextAlign = ltrText ? 'left' : textAlign;

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { textAlign: resolvedTextAlign }]}>{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray400}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        autoFocus={autoFocus}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        style={[
          styles.input,
          { textAlign: resolvedTextAlign },
          multiline ? styles.textarea : null,
          focused ? styles.focused : null,
          error ? styles.inputError : null,
          !editable ? styles.disabled : null,
        ]}
      />
      {error ? (
        <Text style={[styles.errorText, { textAlign: resolvedTextAlign }]}>{error}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    height: 52,
    paddingHorizontal: Spacing.s4,
    fontSize: 15,
    fontWeight: '400',
    color: Colors.gray900,
  },
  textarea: {
    height: undefined,
    minHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  focused: {
    borderColor: Colors.primary600,
    shadowColor: Colors.primary600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  inputError: {
    borderColor: Colors.danger600,
  },
  disabled: {
    backgroundColor: Colors.gray100,
    color: Colors.gray400,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger600,
  },
});
