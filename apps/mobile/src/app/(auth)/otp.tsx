import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView,
  Platform, TouchableOpacity, Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  async function handleVerify() {
    if (code.length < OTP_LENGTH) {
      setError(t('invalidOtp'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone, code);
      const { sessionId, isNewUser } = res.data.data;
      if (isNewUser) {
        router.replace({ pathname: '/(auth)/register', params: { phone, sessionId } });
      } else {
        const loginRes = await authService.login(phone, sessionId);
        const { accessToken, refreshToken, user } = loginRes.data.data;
        const { useAuthStore } = await import('../../stores/auth.store');
        await useAuthStore.getState().setAuth(user, accessToken, refreshToken);
        router.replace(user.role === 'EXPERT' ? '/(expert)/home' : '/(homeowner)/home');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('invalidOtp'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0) return;
    try {
      await authService.sendOtp(phone);
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('error'));
    }
  }

  const digits = code.padEnd(OTP_LENGTH, ' ').split('');

  return (
    <ScreenWrapper scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text variant="h2" style={{ textAlign }}>{t('verifyOtp')}</Text>
            <Text variant="sm" muted style={[styles.subtitle, { textAlign }]}>
              {t('otpSubtitle')}
            </Text>
            <Text variant="sm" color={Colors.primary} style={{ textAlign }}>{phone}</Text>

            {/* Hidden real input */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, OTP_LENGTH));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
            />

            {/* Visual digit boxes */}
            <Pressable style={styles.digitRow} onPress={() => inputRef.current?.focus()}>
              {digits.map((d, i) => (
                <View
                  key={i}
                  style={[
                    styles.digitBox,
                    i === code.length && styles.digitBoxActive,
                    error ? styles.digitBoxError : null,
                  ]}
                >
                  <Text variant="h2">{d.trim()}</Text>
                </View>
              ))}
            </Pressable>

            {error ? <Text variant="sm" color={Colors.danger} style={{ textAlign }}>{error}</Text> : null}

            <Button
              label={t('verify')}
              onPress={handleVerify}
              loading={loading}
              fullWidth
              style={styles.btn}
              disabled={code.length < OTP_LENGTH}
            />

            <TouchableOpacity onPress={handleResend} disabled={secondsLeft > 0} style={styles.resendRow}>
              <Text
                variant="sm"
                color={secondsLeft > 0 ? Colors.textSecondary : Colors.primary}
                style={{ textAlign }}
              >
                {secondsLeft > 0 ? t('resendIn', { sec: secondsLeft }) : t('resendOtp')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: { paddingTop: Spacing.md },
  backBtn: { paddingVertical: Spacing.sm },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
  subtitle: { color: Colors.textSecondary },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: { borderColor: Colors.primary },
  digitBoxError: { borderColor: Colors.danger },
  btn: { marginTop: Spacing.sm },
  resendRow: { alignItems: 'center', paddingTop: Spacing.sm },
});
