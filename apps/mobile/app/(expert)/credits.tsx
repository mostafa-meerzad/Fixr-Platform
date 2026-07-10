import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Divider } from '@/components/ui/Divider';
import { creditsService } from '@/services/credits.service';
import { usersService } from '@/services/users.service';
import { formatRelativeTime } from '@/utils/format';

type TransactionType =
  | 'BID_SPEND'
  | 'BID_REFUND'
  | 'PURCHASE'
  | 'WELCOME_GRANT'
  | 'ADMIN_ADJUSTMENT';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

function getTypeConfig(type: TransactionType) {
  switch (type) {
    case 'BID_SPEND':
      return { icon: 'gavel', bg: Colors.danger100, color: Colors.danger600 };
    case 'BID_REFUND':
      return { icon: 'undo', bg: Colors.success100, color: Colors.success600 };
    case 'PURCHASE':
      return { icon: 'add-circle', bg: Colors.success100, color: Colors.success600 };
    case 'WELCOME_GRANT':
      return { icon: 'card-giftcard', bg: Colors.success100, color: Colors.success600 };
    case 'ADMIN_ADJUSTMENT':
      return { icon: 'tune', bg: Colors.info100, color: Colors.info600 };
  }
}


export default function CreditsScreen() {
  const { t } = useTranslation();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, ledgerRes] = await Promise.all([
        usersService.getMe(),
        creditsService.ledger(1, 20),
      ]);
      setBalance(profileRes.data.expertProfile?.creditBalance?.balance ?? 0);
      setTransactions(ledgerRes.data.data ?? []);
      setTotalPages(ledgerRes.data.totalPages ?? 1);
      setPage(1);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await creditsService.ledger(next, 20);
      setTransactions((prev) => [...prev, ...(res.data.data ?? [])]);
      setPage(next);
      setTotalPages(res.data.totalPages ?? 1);
    } catch {
      // silently ignore load-more errors
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const cfg = getTypeConfig(item.type);
    const isPositive = item.amount > 0;
    return (
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
        <View style={styles.rowMiddle}>
          <Text style={styles.rowType}>
            {t(`expert.credits.types.${item.type}`)}
          </Text>
          <Text style={styles.rowDesc} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text
            style={[
              styles.rowAmount,
              isPositive ? styles.positive : styles.negative,
            ]}
          >
            {isPositive ? '+' : ''}
            {item.amount}
          </Text>
          <Text style={styles.rowBalance}>
            {formatRelativeTime(item.createdAt, 'en')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('expert.credits.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <EmptyState
          icon="error"
          title={t('common.error')}
          subtitle={error}
          action={{ label: t('common.retry'), onPress: load }}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>
                {t('expert.credits.currentBalance')}
              </Text>
              <Text style={styles.balanceValue}>{balance}</Text>
              <Text style={styles.balanceUnit}>
                {t('expert.profile.creditsAvailable')}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt_long"
              title={t('expert.credits.empty')}
              subtitle={t('expert.credits.emptySub')}
            />
          }
          ItemSeparatorComponent={() => <Divider style={styles.separator} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreWrap}>
                <ActivityIndicator color={Colors.primary600} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: Spacing.s6,
  },
  balanceCard: {
    backgroundColor: Colors.primary50,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s4,
    marginBottom: Spacing.s3,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    borderWidth: 1.5,
    borderColor: Colors.primary100,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    marginBottom: Spacing.s2,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.primary600,
  },
  balanceUnit: {
    ...Typography.body,
    color: Colors.gray600,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    gap: Spacing.s3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMiddle: {
    flex: 1,
    gap: 2,
  },
  rowType: {
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  rowDesc: {
    ...Typography.caption,
    color: Colors.gray400,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowAmount: {
    ...Typography.bodyMd,
  },
  positive: {
    color: Colors.success600,
  },
  negative: {
    color: Colors.danger600,
  },
  rowBalance: {
    ...Typography.caption,
    color: Colors.gray400,
  },
  separator: {
    marginVertical: 0,
    marginLeft: Spacing.s4 + 40 + Spacing.s3,
  },
  loadMoreWrap: {
    paddingVertical: Spacing.s4,
    alignItems: 'center',
  },
});
