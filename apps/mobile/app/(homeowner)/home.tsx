import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useAuthStore } from '@/stores/auth.store';
import { jobsService, type Job, type JobListResponse } from '@/services/jobs.service';
import { formatRelativeTime } from '@/utils/format';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getUrgencyLabel(urgency: string): string {
  if (urgency === 'EMERGENCY') return 'Emergency';
  if (urgency === 'TODAY') return 'Today';
  return 'Scheduled';
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: 'Open',
    ASSIGNED: 'Assigned',
    EN_ROUTE: 'En Route',
    ARRIVED: 'Arrived',
    IN_PROGRESS: 'In Progress',
    COMPLETION_REQUESTED: 'Completion Req.',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed',
    DRAFT: 'Draft',
  };
  return map[status] ?? status;
}

const ACTIVE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];

function navigateToJob(id: string, status: string) {
  if (ACTIVE_STATUSES.includes(status)) {
    router.push(`/(homeowner)/active-job/${id}` as any);
  } else {
    router.push(`/(homeowner)/job/${id}` as any);
  }
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.name ?? '').split(' ')[0];

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await jobsService.list({ limit: 3, page: 1 });
      const body = res.data as JobListResponse;
      setJobs(body.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}
        </Text>
        <Text style={styles.title}>{t('homeowner.home.title')}</Text>
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
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Button
            label={t('homeowner.home.postJob')}
            leftIcon={Icons.add}
            onPress={() => router.push('/(homeowner)/post/create' as any)}
          />

          {jobs.length === 0 ? (
            <EmptyState
              icon={Icons.homeRepair}
              title={t('homeowner.home.emptyTitle')}
              subtitle={t('homeowner.home.emptySubtitle')}
              action={{
                label: t('homeowner.home.postJob'),
                onPress: () => router.push('/(homeowner)/post/create' as any),
              }}
            />
          ) : (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>{t('homeowner.home.recentActivity')}</Text>
                <TouchableOpacity onPress={() => router.push('/(homeowner)/my-jobs' as any)}>
                  <Text style={styles.seeAll}>{t('homeowner.home.seeAll')}</Text>
                </TouchableOpacity>
              </View>

              {jobs.map((job) => (
                <Card
                  key={job.id}
                  variant={job.urgency === 'EMERGENCY' ? 'emergency' : 'default'}
                  onPress={() => navigateToJob(job.id, job.status)}
                  style={styles.jobCard}
                >
                  <View style={styles.cardRow}>
                    <Text style={styles.jobTitle} numberOfLines={2}>
                      {job.title}
                    </Text>
                    <Pill
                      label={getUrgencyLabel(job.urgency)}
                      variant={
                        job.urgency === 'EMERGENCY'
                          ? 'danger'
                          : job.urgency === 'TODAY'
                            ? 'warning'
                            : 'gray'
                      }
                    />
                  </View>

                  <Text style={styles.jobMeta}>
                    {job.zone?.nameEn} · {formatRelativeTime(job.createdAt, 'en')}
                  </Text>

                  <View style={styles.cardRow}>
                    {job.status === 'OPEN' ? (
                      <Text style={styles.bidCount}>
                        {job._count?.bids ?? 0} {t('homeowner.home.bids')}
                      </Text>
                    ) : (
                      <View />
                    )}
                    <Pill
                      label={getStatusLabel(job.status)}
                      variant={getStatusVariant(job.status)}
                    />
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
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
  greeting: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.s4,
    gap: Spacing.s3,
    flexGrow: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.s1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary600,
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
