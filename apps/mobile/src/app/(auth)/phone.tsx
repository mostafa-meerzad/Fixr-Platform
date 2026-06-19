import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FixrLogo } from '../../components/ui/FixrLogo';
import { authService } from '../../services/auth.service';
import { Colors, Spacing } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 10) {
      setError(t('invalidPhone'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.sendOtp(cleaned);
      router.push({ pathname: '/(auth)/otp', params: { phone: cleaned } });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.logoArea}>
            <FixrLogo size="lg" subtitle={t('phoneSubtitle')} />
          </View>

          <View style={styles.form}>
            <Text variant="h2" style={{ textAlign }}>{t('enterPhone')}</Text>
            <Text variant="sm" muted style={[styles.subtitle, { textAlign }]}>
              {t('phoneSubtitle')}
            </Text>

            <Input
              label={t('phoneLabel')}
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={error}
              autoFocus
            />

            <Button
              label={t('sendCode')}
              onPress={handleSend}
              loading={loading}
              fullWidth
              style={styles.btn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: Spacing.xxxl },
  logoArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { gap: Spacing.lg },
  subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.md, color: Colors.textSecondary },
  btn: { marginTop: Spacing.sm },
});
