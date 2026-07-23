import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
          <MaterialCommunityIcons name="clipboard-check-outline" size={48} color={Colors.primary600} />
        </View>

        <Text style={styles.title}>{t('auth.onboarding.submittedTitle')}</Text>
        <Text style={styles.body}>{t('auth.onboarding.submittedBody')}</Text>

        <DocsStatusCard label={t('auth.onboarding.submittedDocsRow')} />

        <Text style={styles.creditsNote}>{t('auth.onboarding.submittedCreditsNote')}</Text>

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function DocsStatusCard({ label }: { label: string }) {
  return (
    <View style={styles.docsCard}>
      <View style={styles.dotsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
      <Text style={styles.docsLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    backgroundColor: Colors.primary100,
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
    marginBottom: Spacing.s6,
  },
  docsCard: {
    width: '100%',
    backgroundColor: Colors.success100,
    borderRadius: Radius.md,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    alignItems: 'center',
    gap: Spacing.s2,
    marginBottom: Spacing.s5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.success600,
  },
  docsLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '500',
    color: Colors.success600,
    textAlign: 'center',
  },
  creditsNote: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.caption.fontWeight,
    color: Colors.gray400,
    textAlign: 'center',
    marginBottom: Spacing.s8,
  },
  footer: {
    width: '100%',
  },
});
