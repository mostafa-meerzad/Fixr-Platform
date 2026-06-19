import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { bidsService } from '../../services/bids.service';
import { Colors, Spacing } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

const STATUS_VARIANT: Record<string, any> = {
  PENDING: 'today',
  ACCEPTED: 'active',
  REJECTED: 'done',
  WITHDRAWN: 'done',
};

export default function MyBidsScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await bidsService.mine();
      setBids(res.data?.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() { setRefreshing(true); load(); }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      PENDING: t('pending'),
      ACCEPTED: t('accepted'),
      REJECTED: t('rejected'),
      WITHDRAWN: t('withdrawn'),
    };
    return map[status] ?? status;
  }

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      <Text variant="h2" style={[styles.title, { textAlign }]}>{t('myBids')}</Text>

      {loading ? (
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      ) : bids.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="sm" muted style={{ textAlign }}>{t('noBids')}</Text>
        </Card>
      ) : (
        bids.map((bid) => (
          <TouchableOpacity
            key={bid.id}
            onPress={() => {
              if (bid.status === 'ACCEPTED') {
                router.push({ pathname: '/(expert)/active-job/[id]', params: { id: bid.jobId } });
              } else {
                router.push({ pathname: '/(expert)/job/[id]', params: { id: bid.jobId } });
              }
            }}
          >
            <Card style={styles.bidCard}>
              <View style={[styles.row, { flexDirection }]}>
                <Text variant="body" bold style={[{ flex: 1 }, { textAlign }]}>
                  {bid.job?.title ?? '—'}
                </Text>
                <Badge variant={STATUS_VARIANT[bid.status] ?? 'done'} label={statusLabel(bid.status)} />
              </View>
              <View style={[styles.row, { flexDirection }]}>
                <Text variant="sm" color={Colors.primary} bold>
                  {bid.price} {t('afn')}
                </Text>
                <Text variant="xs" muted>
                  {formatRelativeTime(bid.createdAt, i18n.language)}
                </Text>
              </View>
              <Text variant="xs" muted style={{ textAlign }}>
                {bid.job?.zone?.name} · {bid.job?.category?.name}
              </Text>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: Spacing.lg },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  bidCard: { marginBottom: Spacing.sm, gap: Spacing.sm },
  row: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
});
