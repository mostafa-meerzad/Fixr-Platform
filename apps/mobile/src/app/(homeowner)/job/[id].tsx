import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Divider } from '../../../components/ui/Divider';
import { StarRating } from '../../../components/ui/StarRating';
import { jobsService } from '../../../services/jobs.service';
import { bidsService } from '../../../services/bids.service';
import { Colors, Spacing, Radius } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';
import { formatRelativeTime, formatAFN, formatArrival, formatDuration } from '../../../utils/format';

export default function HomeownerJobDetailScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [jobRes, bidsRes] = await Promise.all([
        jobsService.get(id),
        bidsService.listForJob(id),
      ]);
      setJob(jobRes.data?.data);
      setBids(bidsRes.data?.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  function onRefresh() { setRefreshing(true); load(); }

  async function handleAccept(bidId: string) {
    Alert.alert(t('acceptBid'), t('acceptBidConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), onPress: async () => {
          setAccepting(bidId);
          try {
            await bidsService.accept(id, bidId);
            await load();
            router.push({ pathname: '/(homeowner)/active-job/[id]', params: { id } });
          } catch (e: any) {
            Alert.alert(t('error'), e?.response?.data?.message ?? t('error'));
          } finally {
            setAccepting(null);
          }
        },
      },
    ]);
  }

  if (loading || !job) {
    return (
      <ScreenWrapper scroll={false}>
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      </ScreenWrapper>
    );
  }

  const urgencyVariant = job.urgency === 'EMERGENCY' ? 'emergency' : job.urgency === 'TODAY' ? 'today' : 'active';
  const canAcceptBids = job.status === 'OPEN';
  const isActive = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'].includes(job.status);

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
      </TouchableOpacity>

      {/* Job summary */}
      <Card style={styles.card}>
        <View style={[styles.titleRow, { flexDirection }]}>
          <Text variant="h3" style={[{ flex: 1 }, { textAlign }]}>{job.title}</Text>
          <Badge variant={urgencyVariant} label={t(job.urgency.toLowerCase())} />
        </View>
        <Text variant="xs" muted style={{ textAlign }}>
          {job.zone?.name} · {job.category?.name}
        </Text>
        <Divider />
        <Text variant="sm" style={{ textAlign }}>{job.description}</Text>
        {job.address && <Text variant="xs" muted style={{ textAlign }}>{t('jobAddress')}: {job.address}</Text>}
        <Text variant="xs" muted style={{ textAlign }}>
          {formatRelativeTime(job.createdAt, i18n.language)}
        </Text>
      </Card>

      {/* Active job shortcut */}
      {isActive && (
        <Button
          label={t('activeJob')}
          onPress={() => router.push({ pathname: '/(homeowner)/active-job/[id]', params: { id } })}
          fullWidth
          style={{ marginBottom: Spacing.lg }}
        />
      )}

      {/* Bids */}
      <Text variant="h3" style={[styles.bidsHeader, { textAlign }]}>
        {t('bidsReceived')} ({bids.length})
      </Text>

      {bids.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="sm" muted style={{ textAlign }}>{t('noBidsYet')}</Text>
        </Card>
      ) : (
        bids.map((bid) => (
          <BidCard
            key={bid.id}
            bid={bid}
            canAccept={canAcceptBids}
            onAccept={() => handleAccept(bid.id)}
            accepting={accepting === bid.id}
            t={t}
            i18n={i18n}
            textAlign={textAlign}
            flexDirection={flexDirection}
          />
        ))
      )}
    </ScreenWrapper>
  );
}

function BidCard({ bid, canAccept, onAccept, accepting, t, i18n, textAlign, flexDirection }: any) {
  const expert = bid.expert?.user;
  const ep = bid.expert;

  return (
    <Card style={styles.bidCard}>
      <View style={[styles.bidTop, { flexDirection }]}>
        <View style={{ flex: 1 }}>
          <Text variant="body" bold style={{ textAlign }}>{expert?.name ?? '—'}</Text>
          {ep?.avgRating != null && <StarRating value={ep.avgRating} size={14} />}
        </View>
        <Text variant="h3" color={Colors.primary}>{formatAFN(bid.price)}</Text>
      </View>

      <View style={[styles.bidMeta, { flexDirection }]}>
        <MetaItem label={t('eta')} value={formatArrival(bid.estimatedArrivalMinutes, i18n.language)} />
        <MetaItem label={t('duration')} value={formatDuration(bid.estimatedDurationHours, i18n.language)} />
        <MetaItem label={t('jobsCompleted')} value={ep?.completedJobs ?? 0} />
      </View>

      {bid.warrantyDescription && (
        <Text variant="xs" muted style={{ textAlign }}>{t('warrantyNote')}: {bid.warrantyDescription}</Text>
      )}
      {bid.expertMessage && (
        <Text variant="sm" style={{ textAlign }}>{bid.expertMessage}</Text>
      )}

      {canAccept && (
        <Button
          label={t('acceptBid')}
          onPress={onAccept}
          loading={accepting}
          size="sm"
          fullWidth
          style={{ marginTop: Spacing.sm }}
        />
      )}
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.metaItem}>
      <Text variant="xs" muted>{label}</Text>
      <Text variant="sm" bold>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  card: { gap: Spacing.sm, marginBottom: Spacing.lg },
  titleRow: { alignItems: 'flex-start', gap: Spacing.md },
  bidsHeader: { marginBottom: Spacing.md },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  bidCard: { marginBottom: Spacing.md, gap: Spacing.sm },
  bidTop: { alignItems: 'flex-start', gap: Spacing.md },
  bidMeta: { gap: Spacing.lg, marginTop: Spacing.xs },
  metaItem: { gap: 2 },
});
