import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function SubmittedScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="check" size={48} color={Colors.success600} />
        </View>

        <Text style={styles.title}>{t('auth.onboarding.submittedTitle')}</Text>
        <Text style={styles.body}>{t('auth.onboarding.submittedBody')}</Text>

        <View style={styles.footer}>
          <Button
            label={t('auth.onboarding.submittedCta')}
            onPress={() => router.replace('/(expert)/browse' as any)}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s10,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.success100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s6,
  },
  title: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight,
    color: Colors.primary600,
    textAlign: 'center',
    marginBottom: Spacing.s4,
  },
  body: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    width: '100%',
    marginTop: Spacing.s10,
  },
});
