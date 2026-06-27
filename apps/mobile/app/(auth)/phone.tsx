import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { authService } from '@/services/auth.service';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const MIN_DIGITS = 9;
const MAX_DIGITS = 10;

export default function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;

  function handleChange(text: string) {
    const numeric = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
    setDigits(numeric);
  }

  async function handleContinue() {
    if (!isValid) return;
    const phone = `+93${digits}`;
    setLoading(true);
    try {
      await authService.sendOtp(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? t('auth.phone.errorNetwork');
      toast.show({ message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.brandSection}>
          <View style={styles.logoBox}>
            <MaterialIcons name="home" size={40} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Fixr</Text>
          <Text style={styles.tagline}>{t('auth.phone.subtitle')}</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('auth.phone.label')}</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.flag}>🇦🇫</Text>
              <Text style={styles.prefixText}>+93</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.digitWrapper}>
              <Text
                style={[styles.digitDisplay, digits.length === 0 && styles.digitPlaceholder]}
                numberOfLines={1}
              >
                {digits.length > 0 ? digits : t('auth.phone.placeholder')}
              </Text>
              {/* Transparent TextInput captures numeric keyboard input */}
              <TextInput
                value={digits}
                onChangeText={handleChange}
                keyboardType="number-pad"
                autoFocus
                caretHidden
                maxLength={MAX_DIGITS}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.hiddenInput}
              />
            </View>
          </View>
          <Text style={styles.helperText}>{t('auth.phone.helper')}</Text>
        </View>

        <View style={styles.footer}>
          <Button
            label={t('auth.phone.continue')}
            onPress={handleContinue}
            disabled={!isValid}
            loading={loading}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s12,
    paddingBottom: Spacing.s6,
  },

  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing.s12,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s3,
  },
  appName: {
    fontSize: Typography.display.fontSize,
    fontWeight: Typography.display.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s1,
  },
  tagline: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray400,
  },

  inputSection: {
    gap: Spacing.s2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: Radius.sm,
    height: 52,
    shadowColor: Colors.primary600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 0,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.s4,
    paddingRight: Spacing.s3,
    gap: Spacing.s2,
  },
  flag: {
    fontSize: 18,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray900,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: Colors.gray200,
  },
  digitWrapper: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  digitDisplay: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.gray900,
  },
  digitPlaceholder: {
    color: Colors.gray400,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
  helperText: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray400,
  },

  footer: {
    position: 'absolute',
    bottom: Spacing.s6,
    left: Spacing.s4,
    right: Spacing.s4,
  },
});
