import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Divider } from '../../components/ui/Divider';
import { useAuthStore } from '../../stores/auth.store';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

const TX_TYPE_COLOR: Record<string, string> = {
  BID_SPEND: Colors.danger,
  BID_REFUND: Colors.primary,
  ADMIN_GRANT: Colors.primary,
  WELCOME_GRANT: Colors.primary,
  ADMIN_ADJUST: Colors.warning,
  PURCHASE: Colors.primary,
};

export default function CreditsScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { accessToken } = useAuthStore();

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [balRes, txRes] = await Promise.all([
        fetch(`${base}/credits/me/balance`, { headers }).then((r) => r.json()),
        fetch(`${base}/credits/me/ledger?limit=50`, { headers }).then((r) => r.json()),
      ]);
      setBalance(balRes?.data?.balance ?? 0);
      setTransactions(txRes?.data?.items ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() { setRefreshing(true); load(); }

  function txSign(type: string): string {
    return ['BID_SPEND'].includes(type) ? '−' : '+';
  }

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      <Text variant="h2" style={[styles.title, { textAlign }]}>{t('earnings')}</Text>

      {/* Balance card */}
      <Card style={styles.balanceCard}>
        <Text variant="label">{t('creditBalance')}</Text>
        {balance !== null ? (
          <Text variant="h1" color={Colors.primary}>{balance}</Text>
        ) : (
          <Text variant="h1" muted>—</Text>
        )}
        <Text variant="sm" muted>{t('credits')}</Text>
      </Card>

      <Divider />
      <Text variant="label" style={[styles.sectionLabel, { textAlign }]}>
        {t('loading').replace('...', '')}
      </Text>

      {loading ? (
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      ) : transactions.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="sm" muted style={{ textAlign }}>{t('noBids')}</Text>
        </Card>
      ) : (
        transactions.map((tx) => (
          <Card key={tx.id} style={styles.txCard}>
            <View style={[styles.txRow, { flexDirection }]}>
              <View style={{ flex: 1 }}>
                <Text variant="sm" style={{ textAlign }}>{tx.description ?? tx.type}</Text>
                <Text variant="xs" muted style={{ textAlign }}>
                  {formatRelativeTime(tx.createdAt, i18n.language)}
                </Text>
              </View>
              <Text
                variant="body"
                bold
                color={TX_TYPE_COLOR[tx.type] ?? Colors.textPrimary}
              >
                {txSign(tx.type)}{tx.amount}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: Spacing.lg },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sectionLabel: { marginVertical: Spacing.md },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  txCard: { marginBottom: Spacing.sm },
  txRow: { alignItems: 'center', gap: Spacing.md },
});
