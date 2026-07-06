import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { Icons } from '@/constants/icons';
import { bidsService } from '@/services/bids.service';
import { jobsService, type Job, type JobListResponse } from '@/services/jobs.service';
import { formatRelativeTime, formatAFNEn } from '@/utils/format';

interface Bid {
  id: string;
  price: number;
  estimatedArrivalMinutes: number;
  isWithdrawn?: boolean;
  createdAt: string;
  job: {
    id: string;
    title: string;
    status: string;
    acceptedBidId?: string | null;
    zone?: { nameEn: string };
  };
}

type TabView = 'bids' | 'active';

const ACTIVE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];

function getBidStatusLabel(bid: Bid): string {
  if (bid.isWithdrawn) return 'Withdrawn';
  if (bid.job?.acceptedBidId === bid.id) return 'Accepted';
  if (bid.job?.status === 'OPEN') return 'Pending';
  return 'Not Selected';
}

function getBidStatusVariant(bid: Bid): 'success' | 'warning' | 'gray' {
  if (bid.isWithdrawn) return 'gray';
  if (bid.job?.acceptedBidId === bid.id) return 'success';
  if (bid.job?.status === 'OPEN') return 'warning';
  return 'gray';
}

function getActiveJobCTALabel(status: string): string {
  switch (status) {
    case 'ASSIGNED':             return "I'm On My Way";
    case 'EN_ROUTE':             return "I've Arrived";
    case 'ARRIVED':              return 'Start Job';
    case 'IN_PROGRESS':         return 'Request Completion';
    case 'COMPLETION_REQUESTED': return 'Waiting for confirmation...';
    default:                     return '';
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ASSIGNED: 'Assigned',
    EN_ROUTE: 'On My Way',
    ARRIVED: 'Arrived',
    IN_PROGRESS: 'In Progress',
    COMPLETION_REQUESTED: 'Completion Req.',
    COMPLETED: 'Completed',
  };
  return map[status] ?? status;
}

export default function MyBidsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabView>('bids');

  const [bids, setBids] = useState<Bid[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [bidsRes, jobsRes] = await Promise.all([
        bidsService.mine(),
        jobsService.list({ limit: 50, page: 1 }),
      ]);
      const bidsData = bidsRes.data as Bid[] | { data: Bid[] };
      setBids(Array.isArray(bidsData) ? bidsData : bidsData.data ?? []);

      const jobsBody = jobsRes.data as JobListResponse;
      setActiveJobs(
        jobsBody.data.filter((j) => ACTIVE_STATUSES.includes(j.status)),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderBidItem = ({ item: bid }: { item: Bid }) => {
    const isPending = !bid.isWithdrawn && bid.job?.status === 'OPEN';
    return (
      <Card
        style={styles.bidCard}
        onPress={isPending ? () => router.push(`/(expert)/job/${bid.job.id}` as any) : undefined}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {bid.job?.title ?? '—'}
          </Text>
          <Pill label={getBidStatusLabel(bid)} variant={getBidStatusVariant(bid)} />
        </View>
        <Text style={styles.cardMeta}>
          {bid.job?.zone?.nameEn ?? ''}
          {bid.job?.zone?.nameEn ? ' · ' : ''}
          {bid.createdAt ? formatRelativeTime(bid.createdAt, 'en') : ''}
        </Text>
        <Divider style={styles.cardDivider} />
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.bidLabel}>{t('expert.myBids.yourBid')}</Text>
            <Text style={styles.bidPrice}>{formatAFNEn(bid.price)}</Text>
          </View>
          <View style={styles.arrivalBlock}>
            <Text style={styles.bidLabel}>{t('expert.myBids.arrival')}</Text>
            <Text style={styles.bidArrival}>
              {bid.estimatedArrivalMinutes < 60
                ? `${bid.estimatedArrivalMinutes} min`
                : `${(bid.estimatedArrivalMinutes / 60).toFixed(0)} hr`}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderActiveJobItem = ({ item: job }: { item: Job }) => {
    const ctaLabel = getActiveJobCTALabel(job.status);
    const isWaiting = job.status === 'COMPLETION_REQUESTED';
    return (
      <Card
        style={styles.bidCard}
        onPress={() => router.push(`/(expert)/active-job/${job.id}` as any)}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <Pill label={getStatusLabel(job.status)} variant={getStatusVariant(job.status)} />
        </View>
        <Text style={styles.cardMeta}>
          {job.zone?.nameEn ?? ''}
        </Text>
        <Button
          label={ctaLabel}
          disabled={isWaiting}
          onPress={() => router.push(`/(expert)/active-job/${job.id}` as any)}
          style={styles.ctaBtn}
        />
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{t('expert.myBids.subtitle')}</Text>
        <Text style={styles.title}>{t('expert.myBids.title')}</Text>
      </View>

      {/* Toggle pills */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.togglePill, activeTab === 'bids' && styles.togglePillActive]}
          onPress={() => setActiveTab('bids')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              activeTab === 'bids' ? styles.toggleTextActive : styles.toggleTextInactive,
            ]}
          >
            {t('expert.myBids.bids')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.togglePill, activeTab === 'active' && styles.togglePillActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              activeTab === 'active' ? styles.toggleTextActive : styles.toggleTextInactive,
            ]}
          >
            {t('expert.myBids.activeJobs')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={load} style={styles.retryBtn} />
        </View>
      ) : activeTab === 'bids' ? (
        <FlatList
          data={bids}
          keyExtractor={(item) => item.id}
          renderItem={renderBidItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.s3 }} />}
          ListEmptyComponent={
            <EmptyState
              icon={Icons.gavel}
              title={t('expert.myBids.emptyBidsTitle')}
              subtitle={t('expert.myBids.emptyBidsSubtitle')}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary600}
            />
          }
        />
      ) : (
        <FlatList
          data={activeJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderActiveJobItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.s3 }} />}
          ListEmptyComponent={
            <EmptyState
              icon={Icons.assignment}
              title={t('expert.myBids.emptyActiveTitle')}
              subtitle={t('expert.myBids.emptyActiveSubtitle')}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary600}
            />
          }
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
  },
  title: {
    ...Typography.display,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  togglePill: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  togglePillActive: {
    backgroundColor: Colors.primary600,
    borderColor: Colors.primary600,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.white,
  },
  toggleTextInactive: {
    color: Colors.gray600,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s3,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  retryBtn: {
    maxWidth: 160,
  },
  listContent: {
    padding: Spacing.s4,
    flexGrow: 1,
  },
  bidCard: {
    gap: Spacing.s2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.s2,
  },
  cardTitle: {
    ...Typography.heading3,
    color: Colors.primary600,
    flex: 1,
  },
  cardMeta: {
    ...Typography.caption,
  },
  cardDivider: {
    marginVertical: Spacing.s1,
  },
  bidLabel: {
    fontSize: 11,
    color: Colors.gray400,
    marginBottom: 2,
  },
  bidPrice: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Colors.gray900,
  },
  bidArrival: {
    ...Typography.bodyMd,
    color: Colors.gray900,
    textAlign: 'right',
  },
  arrivalBlock: {
    alignItems: 'flex-end',
  },
  ctaBtn: {
    marginTop: Spacing.s2,
  },
});
