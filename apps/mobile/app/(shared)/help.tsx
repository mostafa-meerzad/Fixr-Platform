import React, { useState } from 'react';
import {
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
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

export default function HelpScreen() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<number | null>(null);

  const rawPhone = t('shared.help.phone').replace(/\s/g, '');

  const faqs: Array<{ q: string; a: string }> = [
    { q: t('shared.help.faq1Q'), a: t('shared.help.faq1A') },
    { q: t('shared.help.faq2Q'), a: t('shared.help.faq2A') },
    { q: t('shared.help.faq3Q'), a: t('shared.help.faq3A') },
    { q: t('shared.help.faq4Q'), a: t('shared.help.faq4A') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shared.help.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* FAQ accordion card */}
        <View style={styles.faqCard}>
          {faqs.map((faq, idx) => (
            <View key={idx}>
              <TouchableOpacity
                style={styles.faqRow}
                onPress={() => setExpanded((prev) => (prev === idx ? null : idx))}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <MaterialCommunityIcons
                  name={(expanded === idx ? 'expand-less' : 'expand-more') as any}
                  size={22}
                  color={Colors.gray400}
                />
              </TouchableOpacity>

              {expanded === idx && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}

              {idx < faqs.length - 1 && (
                <View style={styles.faqDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Dark call CTA card */}
        <TouchableOpacity
          style={styles.callCard}
          onPress={() => Linking.openURL(`tel:${rawPhone}`)}
          activeOpacity={0.85}
        >
          <View style={styles.callIconWrap}>
            <MaterialCommunityIcons name={Icons.phone as any} size={22} color={Colors.white} />
          </View>
          <View style={styles.callText}>
            <Text style={styles.callNumber}>{t('shared.help.callUs')}</Text>
            <Text style={styles.callHint}>{t('shared.help.callHint')}</Text>
          </View>
        </TouchableOpacity>
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
  },

  // FAQ
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    paddingHorizontal: Spacing.s4,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s4,
    gap: Spacing.s3,
  },
  faqQuestion: {
    ...Typography.bodyMd,
    color: Colors.gray900,
    flex: 1,
  },
  faqAnswer: {
    ...Typography.body,
    color: Colors.gray600,
    lineHeight: 22,
    paddingBottom: Spacing.s4,
  },
  faqDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
  },

  // Call CTA
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  callIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  callText: {
    flex: 1,
    gap: 3,
  },
  callNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  callHint: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
});
