import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { usersService } from '@/services/users.service';

type PackId = 'starter' | 'regular' | 'pro';
type PayMethod = 'M-Paisa' | 'AWCC Pay' | 'Hawala';

interface Pack {
  id: PackId;
  label: string;
  credits: number;
  price: number;
  perBid: number;
  savings: number | null;
  popular: boolean;
  dark: boolean;
}

const PACKS: Pack[] = [
  { id: 'starter', label: 'Starter', credits: 10, price: 200, perBid: 20, savings: null, popular: false, dark: false },
  { id: 'regular', label: 'Regular', credits: 50, price: 800, perBid: 16, savings: 20, popular: true, dark: false },
  { id: 'pro', label: 'Pro', credits: 150, price: 2000, perBid: 13, savings: 33, popular: false, dark: true },
];

const PAY_METHODS: PayMethod[] = ['M-Paisa', 'AWCC Pay', 'Hawala'];

export default function BuyCreditsScreen() {
  const { t } = useTranslation();
  const purchaseSheetRef = useRef<BottomSheetModal>(null);

  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<PackId>('regular');
  const [selectedPayMethod, setSelectedPayMethod] = useState<PayMethod>('M-Paisa');

  const load = useCallback(async () => {
    try {
      const res = await usersService.getMe();
      setBalance(res.data.expertProfile?.creditBalance?.balance ?? 0);
    } catch {
      // fall back to 0
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedPack = PACKS.find((p) => p.id === selectedPackId) ?? PACKS[1];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name={Icons.back as any} size={22} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('expert.buyCredits.title')}</Text>
        <View style={styles.creditsPill}>
          <MaterialCommunityIcons name={Icons.credit as any} size={14} color={Colors.amber} />
          {balanceLoading ? (
            <ActivityIndicator size="small" color={Colors.white} style={styles.pillLoader} />
          ) : (
            <Text style={styles.creditsPillText}>{balance}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Explainer */}
        <Text style={styles.explainer}>{t('expert.buyCredits.explainer')}</Text>

        {/* Pack cards */}
        <View style={styles.packsContainer}>
          {PACKS.map((pack) => {
            const isSelected = selectedPackId === pack.id;
            const badgeStyle = pack.dark
              ? styles.creditBadgeDark
              : isSelected
              ? styles.creditBadgeSelected
              : styles.creditBadgeDefault;
            const badgeTextStyle = pack.dark || isSelected ? styles.creditBadgeTextLight : undefined;
            const cardStyle = pack.dark
              ? [styles.packCard, styles.packCardDark, isSelected && styles.packCardDarkSelected]
              : [styles.packCard, isSelected && styles.packCardSelected];

            return (
              <View key={pack.id} style={[styles.packWrapper, pack.popular && styles.packWrapperPopular]}>
                {pack.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{t('expert.buyCredits.mostPopular')}</Text>
                  </View>
                )}
                <TouchableOpacity style={cardStyle} onPress={() => setSelectedPackId(pack.id)} activeOpacity={0.85}>
                  {/* Credit count badge */}
                  <View style={[styles.creditBadge, badgeStyle]}>
                    <Text style={[styles.creditBadgeText, badgeTextStyle]}>{pack.credits}</Text>
                  </View>

                  {/* Pack name + per-bid info */}
                  <View style={styles.packMeta}>
                    <Text style={[styles.packName, pack.dark && styles.textWhite]}>{pack.label}</Text>
                    <View style={styles.packSubRow}>
                      <Text style={[styles.packPerBid, pack.dark && styles.packPerBidDark]}>
                        {t('expert.buyCredits.perBid', { amount: pack.perBid })}
                      </Text>
                      {pack.savings !== null && (
                        <>
                          <Text style={[styles.packDot, pack.dark && styles.packDotDark]}>{' · '}</Text>
                          <Text style={styles.packSavings}>
                            {t('expert.buyCredits.save', { pct: pack.savings })}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Price */}
                  <Text style={[styles.packPrice, pack.dark && styles.textWhite]}>
                    {pack.price.toLocaleString()}₾
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Pay with */}
        <View style={styles.paySection}>
          <Text style={styles.payLabel}>{t('expert.buyCredits.payWith')}</Text>
          <View style={styles.payRow}>
            {PAY_METHODS.map((method) => {
              const active = selectedPayMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.payPill, active && styles.payPillActive]}
                  onPress={() => setSelectedPayMethod(method)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.payPillText, active && styles.payPillTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed buy CTA */}
      <View style={styles.ctaBar}>
        <Button
          label={t('expert.buyCredits.cta', {
            credits: selectedPack.credits,
            price: selectedPack.price.toLocaleString(),
          })}
          onPress={() => purchaseSheetRef.current?.present()}
        />
      </View>

      {/* In-person purchase info sheet */}
      <BottomSheet ref={purchaseSheetRef} snapPoints={['55%']}>
        <View style={styles.sheetIconWrap}>
          <MaterialCommunityIcons name={'storefront' as any} size={40} color={Colors.primary600} />
        </View>
        <Text style={styles.sheetTitle}>{t('expert.buySheet.title')}</Text>
        <Text style={styles.sheetBody}>{t('expert.buySheet.body')}</Text>
        <View style={styles.sheetRows}>
          <View style={styles.sheetRow}>
            <MaterialCommunityIcons name={'place' as any} size={18} color={Colors.primary600} />
            <Text style={styles.sheetRowText}>{t('expert.buySheet.address')}</Text>
          </View>
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => Linking.openURL(`tel:${t('expert.buySheet.phone')}`)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={'phone' as any} size={18} color={Colors.primary600} />
            <Text style={[styles.sheetRowText, styles.sheetPhoneText]}>
              {t('expert.buySheet.phone')}
            </Text>
          </TouchableOpacity>
          <View style={styles.sheetRow}>
            <MaterialCommunityIcons name={'schedule' as any} size={18} color={Colors.primary600} />
            <Text style={styles.sheetRowText}>{t('expert.buySheet.hours')}</Text>
          </View>
        </View>
        <Button
          label={t('expert.buySheet.dismiss')}
          onPress={() => purchaseSheetRef.current?.dismiss()}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },

  // Header
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.heading1,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s1,
  },
  creditsPillText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  pillLoader: { transform: [{ scale: 0.7 }] },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s10,
  },

  // Explainer
  explainer: {
    ...Typography.body,
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: Spacing.s5,
  },

  // Packs
  packsContainer: {
    gap: Spacing.s3,
    marginBottom: Spacing.s5,
  },
  packWrapper: {
    position: 'relative',
  },
  packWrapperPopular: {
    marginTop: Spacing.s3,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: Spacing.s3,
    zIndex: 2,
    backgroundColor: Colors.primary600,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s2,
    paddingVertical: 3,
    elevation: 3,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  packCardSelected: {
    borderColor: Colors.primary600,
    borderWidth: 2,
  },
  packCardDark: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  packCardDarkSelected: {
    borderColor: Colors.primary100,
    borderWidth: 2,
  },

  // Credit count badge inside card
  creditBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  creditBadgeDefault: { backgroundColor: Colors.sand },
  creditBadgeSelected: { backgroundColor: Colors.primary600 },
  creditBadgeDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  creditBadgeText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.primary600,
  },
  creditBadgeTextLight: { color: Colors.white },

  // Pack name / sub-row
  packMeta: { flex: 1, gap: 3 },
  packName: { ...Typography.heading3, color: Colors.gray900 },
  packSubRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  packPerBid: { fontSize: 13, color: Colors.gray400 },
  packPerBidDark: { color: 'rgba(255,255,255,0.4)' },
  packDot: { fontSize: 13, color: Colors.gray400 },
  packDotDark: { color: 'rgba(255,255,255,0.3)' },
  packSavings: { fontSize: 13, fontWeight: '600' as const, color: Colors.success600 },
  packPrice: { fontSize: 18, fontWeight: '700' as const, color: Colors.gray900, flexShrink: 0 },
  textWhite: { color: Colors.white },

  // Pay with
  paySection: { gap: Spacing.s3 },
  payLabel: { ...Typography.heading3, color: Colors.gray900 },
  payRow: { flexDirection: 'row', gap: Spacing.s2, flexWrap: 'wrap' },
  payPill: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s2,
  },
  payPillActive: { borderColor: Colors.primary600 },
  payPillText: { fontSize: 14, fontWeight: '500' as const, color: Colors.gray600 },
  payPillTextActive: { color: Colors.primary600, fontWeight: '600' as const },

  // Bottom CTA
  ctaBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s4,
  },

  // Purchase sheet
  sheetIconWrap: { alignItems: 'center', marginBottom: Spacing.s3 },
  sheetTitle: { ...Typography.heading2, textAlign: 'center', marginBottom: Spacing.s2 },
  sheetBody: {
    ...Typography.body,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.s4,
  },
  sheetRows: { gap: Spacing.s3, marginBottom: Spacing.s4 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  sheetRowText: { ...Typography.bodyMd, color: Colors.gray900, flex: 1 },
  sheetPhoneText: { color: Colors.primary600 },
});
