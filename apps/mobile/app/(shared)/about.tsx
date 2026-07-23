import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

export default function AboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handlePolicy = () =>
    Alert.alert(t('shared.about.privacyPolicy'), t('shared.about.comingSoon'));

  const handleTerms = () =>
    Alert.alert(t('shared.about.terms'), t('shared.about.comingSoon'));

  const handleContact = () =>
    Linking.openURL(`mailto:${t('shared.about.contactEmail')}`);

  const links: Array<{ label: string; value?: string; onPress: () => void }> = [
    { label: t('shared.about.privacyPolicy'), onPress: handlePolicy },
    { label: t('shared.about.terms'), onPress: handleTerms },
    {
      label: t('shared.about.contact'),
      value: t('shared.about.contactEmail'),
      onPress: handleContact,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shared.about.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Brand block */}
        <View style={styles.brandCard}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name={'build' as any} size={40} color={Colors.white} />
          </View>
          <Text style={styles.wordmark}>{t('shared.about.wordmark')}</Text>
          <Text style={styles.versionText}>
            {t('shared.about.versionLabel')} {version}
          </Text>
          <Text style={styles.description}>{t('shared.about.description')}</Text>
        </View>

        {/* Links card */}
        <View style={styles.linksCard}>
          {links.map((link, idx) => (
            <View key={link.label}>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={link.onPress}
                activeOpacity={0.7}
              >
                <Text style={styles.linkLabel}>{link.label}</Text>
                {link.value ? (
                  <Text style={styles.linkValue} numberOfLines={1}>
                    {link.value}
                  </Text>
                ) : null}
                <MaterialCommunityIcons
                  name={Icons.chevronRight as any}
                  size={20}
                  color={Colors.gray400}
                />
              </TouchableOpacity>
              {idx < links.length - 1 && <View style={styles.linkDivider} />}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>{t('shared.about.footer')} 🇦🇫</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.heading1,
    color: Colors.primary600,
  },

  content: {
    padding: Spacing.s4,
    gap: Spacing.s3,
    paddingBottom: Spacing.s8,
  },

  // Brand
  brandCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    padding: Spacing.s6,
    alignItems: 'center',
    gap: Spacing.s2,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s2,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary600,
    letterSpacing: -0.5,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.gray400,
  },
  description: {
    ...Typography.body,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.s2,
  },

  // Links
  linksCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s2,
  },
  linkLabel: {
    ...Typography.bodyMd,
    color: Colors.gray900,
    flex: 1,
  },
  linkValue: {
    ...Typography.body,
    color: Colors.gray400,
    flexShrink: 1,
  },
  linkDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.s4,
  },

  // Footer
  footer: {
    ...Typography.caption,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing.s4,
  },
});
