import React, { useCallback, useState } from 'react';
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
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { jobsService, type Job, type JobListResponse } from '@/services/jobs.service';
import { formatRelativeTime } from '@/utils/format';

type Tab = 'active' | 'past';

const ACTIVE_STATUSES = ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];
const PAST_STATUSES = ['COMPLETED', 'CANCELLED'];
const NAV_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];

const URGENCY_ORDER: Record<string, number> = { EMERGENCY: 0, TODAY: 1, SCHEDULED: 2 };

function getUrgencyLabel(urgency: string, t: (key: string) => string): string {
  if (urgency === 'EMERGENCY') return t('homeowner.post.urgencyEmergency');
  if (urgency === 'TODAY') return t('homeowner.post.urgencyToday');
  return t('homeowner.post.urgencyScheduled');
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    OPEN: 'Open',
    ASSIGNED: t('common.status.assigned'),
    EN_ROUTE: t('common.status.enRoute'),
    ARRIVED: t('common.status.arrived'),
    IN_PROGRESS: t('common.status.inProgress'),
    COMPLETION_REQUESTED: t('common.status.completionRequested'),
    COMPLETED: t('common.status.completed'),
    CANCELLED: t('common.status.cancelled'),
    DISPUTED: t('common.status.disputed'),
  };
  return map[status] ?? status;
}

function navigateToJob(id: string, status: string) {
  if (NAV_STATUSES.includes(status)) {
    router.push(`/(homeowner)/active-job/${id}` as any);
  } else {
    router.push(`/(homeowner)/job/${id}` as any);
  }
}

function sortActive(a: Job, b: Job): number {
  const ua = URGENCY_ORDER[a.urgency] ?? 3;
  const ub = URGENCY_ORDER[b.urgency] ?? 3;
  if (ua !== ub) return ua - ub;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function MyJobsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('active');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError(false);
      if (isRefresh) setRefreshing(true);
      const res = await jobsService.list({ limit: 50, page: 1 });
      const body = res.data as JobListResponse;
      setAllJobs(body.data.filter((j) => j.status !== 'DRAFT'));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeJobs = allJobs
    .filter((j) => ACTIVE_STATUSES.includes(j.status))
    .sort(sortActive);

  const pastJobs = allJobs
    .filter((j) => PAST_STATUSES.includes(j.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayJobs = tab === 'active' ? activeJobs : pastJobs;

  const renderJob = ({ item: job }: { item: Job }) => (
    <Card
      variant={job.urgency === 'EMERGENCY' ? 'emergency' : 'default'}
      onPress={() => navigateToJob(job.id, job.status)}
      style={styles.jobCard}
    >
      <View style={styles.cardRow}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {job.title}
        </Text>
        <Pill
          label={getUrgencyLabel(job.urgency, t)}
          variant={
            job.urgency === 'EMERGENCY' ? 'danger' : job.urgency === 'TODAY' ? 'warning' : 'gray'
          }
        />
      </View>

      <Text style={styles.jobMeta}>
        {job.zone?.nameEn} · {formatRelativeTime(job.createdAt, 'en')}
      </Text>

      <View style={styles.cardRow}>
        {job.status === 'OPEN' ? (
          <Text style={styles.bidCount}>
            {job._count?.bids ?? 0} {t('homeowner.myJobs.bids')}
          </Text>
        ) : (
          <View />
        )}
        <Pill label={getStatusLabel(job.status, t)} variant={getStatusVariant(job.status)} />
      </View>
    </Card>
  );

  const renderEmpty = () => {
    if (tab === 'active') {
      return (
        <EmptyState
          icon={Icons.tabWork}
          title={t('homeowner.myJobs.emptyActiveTitle')}
          subtitle={t('homeowner.myJobs.emptyActiveSubtitle')}
          action={{
            label: t('homeowner.myJobs.postJob'),
            onPress: () => router.push('/(homeowner)/post/create' as any),
          }}
        />
      );
    }
    return (
      <EmptyState
        icon={Icons.history}
        title={t('homeowner.myJobs.emptyPastTitle')}
        subtitle={t('homeowner.myJobs.emptyPastSubtitle')}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('homeowner.myJobs.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={() => load()} style={styles.retryBtn} />
        </View>
      ) : (
        <FlatList
          data={displayJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={Colors.primary600}
            />
          }
          ListHeaderComponent={
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.togglePill, tab === 'active' ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => setTab('active')}
              >
                <Text style={[styles.toggleText, tab === 'active' ? styles.toggleTextActive : styles.toggleTextInactive]}>
                  {t('homeowner.myJobs.active')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.togglePill, tab === 'past' ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => setTab('past')}
              >
                <Text style={[styles.toggleText, tab === 'past' ? styles.toggleTextActive : styles.toggleTextInactive]}>
                  {t('homeowner.myJobs.past')}
                </Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.listContent}
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  title: {
    ...Typography.display,
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
    gap: Spacing.s3,
    flexGrow: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    marginBottom: Spacing.s3,
  },
  togglePill: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary600,
  },
  toggleInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
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
  jobCard: {
    gap: Spacing.s2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobTitle: {
    ...Typography.heading3,
    color: Colors.primary600,
    flex: 1,
    marginRight: Spacing.s2,
  },
  jobMeta: {
    ...Typography.caption,
  },
  bidCount: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray600,
  },
});
