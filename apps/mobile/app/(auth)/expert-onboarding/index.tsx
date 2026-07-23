import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function ExpertOnboardingOverviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScreenWrapper scroll>
      <View style={styles.container}>
        <Text style={styles.smallHeader}>
          {t('auth.onboarding.overview.smallHeader')}
        </Text>

        <Text style={styles.headline}>
          {t('auth.onboarding.overview.headline')}
        </Text>
        <Text style={styles.subheadline}>
          {t('auth.onboarding.overview.subheadline')}
        </Text>

        <View style={styles.steps}>
          <StepRow
            number={1}
            title={t('auth.onboarding.overview.step1Title')}
            subtitle={t('auth.onboarding.overview.step1Subtitle')}
            isLast={false}
          />
          <StepRow
            number={2}
            title={t('auth.onboarding.overview.step2Title')}
            subtitle={t('auth.onboarding.overview.step2Subtitle')}
            isLast={false}
          >
            <View style={styles.docTiles}>
              <DocTile
                icon="badge"
                label={t('auth.onboarding.overview.docTazkira')}
              />
              <DocTile
                icon="face"
                label={t('auth.onboarding.overview.docSelfie')}
              />
            </View>
          </StepRow>
          <StepRow
            number={3}
            title={t('auth.onboarding.overview.step3Title')}
            subtitle={t('auth.onboarding.overview.step3Subtitle')}
            isLast
          />
        </View>

        <View style={styles.optionalNote}>
          <MaterialCommunityIcons name="star-circle" size={16} color={Colors.amber} />
          <Text style={styles.optionalNoteText}>
            {t('auth.onboarding.overview.optionalNote')}
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            label={t('auth.onboarding.overview.cta')}
            onPress={() =>
              router.push('/(auth)/expert-onboarding/selfie' as any)
            }
          />
          <Text style={styles.footnote}>
            {t('auth.onboarding.overview.footnote')}
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

interface StepRowProps {
  number: number;
  title: string;
  subtitle: string;
  isLast: boolean;
  children?: React.ReactNode;
}

function StepRow({ number, title, subtitle, isLast, children }: StepRowProps) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepLeft}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepNumber}>{number}</Text>
        </View>
        {!isLast && <View style={styles.connector} />}
      </View>
      <View style={[styles.stepContent, isLast && styles.stepContentLast]}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
        {children}
      </View>
    </View>
  );
}

interface DocTileProps {
  icon: string;
  label: string;
}

function DocTile({ icon, label }: DocTileProps) {
  return (
    <View style={styles.docTile}>
      <MaterialCommunityIcons name={icon as any} size={18} color={Colors.primary600} />
      <Text style={styles.docTileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s8,
    paddingBottom: Spacing.s6,
  },
  smallHeader: {
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
    color: Colors.primary600,
    letterSpacing: 0.4,
    marginBottom: Spacing.s4,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.s2,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: Spacing.s8,
  },

  // Steps
  steps: {
    marginBottom: Spacing.s6,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.s4,
  },
  stepLeft: {
    alignItems: 'center',
    width: 36,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.sand,
    marginVertical: Spacing.s1,
    minHeight: 24,
  },
  stepContent: {
    flex: 1,
    paddingBottom: Spacing.s5,
  },
  stepContentLast: {
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight as any,
    color: Colors.gray900,
    marginBottom: Spacing.s1,
    marginTop: Spacing.s2,
  },
  stepSubtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    lineHeight: 20,
  },

  // Doc tiles
  docTiles: {
    flexDirection: 'row',
    gap: Spacing.s3,
    marginTop: Spacing.s3,
  },
  docTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary100,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s3,
  },
  docTileLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.primary600,
  },

  // Optional note
  optionalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    backgroundColor: Colors.sand,
    borderRadius: Radius.md,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    marginBottom: Spacing.s6,
  },
  optionalNoteText: {
    flex: 1,
    fontSize: Typography.label.fontSize,
    fontWeight: '400',
    color: Colors.gray600,
    lineHeight: 18,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    gap: Spacing.s4,
  },
  footnote: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.caption.fontWeight as any,
    color: Colors.gray400,
    textAlign: 'center',
  },
});
