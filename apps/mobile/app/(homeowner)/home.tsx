import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
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
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.name ?? '').split(' ')[0];

  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [draftJobs, setDraftJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await jobsService.list({ limit: 20, page: 1 });
      const body = res.data as JobListResponse;
      const all = body.data;
      setDraftJobs(
        all
          .filter((j) => j.status === 'DRAFT')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
      setRecentJobs(
        all
          .filter((j) => j.status !== 'DRAFT')
          .slice(0, 3),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleContinueDraft(job: Job) {
    router.push(`/(homeowner)/post/media?jobId=${job.id}` as any);
  }

  function handleDeleteDraft(job: Job) {
    Alert.alert(
      t('homeowner.myJobs.deleteConfirmTitle'),
      t('homeowner.myJobs.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('homeowner.myJobs.deleteConfirmBtn'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(job.id);
            try {
              await jobsService.deleteDraft(job.id);
              setDraftJobs((prev) => prev.filter((j) => j.id !== job.id));
              toast.show({ message: t('homeowner.myJobs.deletedToast'), variant: 'success' });
            } catch {
              toast.show({ message: t('common.error'), variant: 'error' });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  const hasContent = recentJobs.length > 0 || draftJobs.length > 0;

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

          {!hasContent ? (
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
              {/* ── Recent Activity ── */}
              {recentJobs.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('homeowner.home.recentActivity')}</Text>
                    <TouchableOpacity onPress={() => router.push('/(homeowner)/my-jobs' as any)}>
                      <Text style={styles.seeAll}>{t('homeowner.home.seeAll')}</Text>
                    </TouchableOpacity>
                  </View>

                  {recentJobs.map((job) => (
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

              {/* ── Drafts ── */}
              {draftJobs.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, styles.draftsLabel]}>
                    {t('homeowner.myJobs.drafts')}
                  </Text>

                  {draftJobs.map((job) => {
                    const isDeleting = deletingId === job.id;
                    return (
                      <Card key={job.id} style={styles.draftCard}>
                        <View style={styles.draftCardTop}>
                          <View style={styles.draftInfo}>
                            <Text style={styles.draftTitle} numberOfLines={2}>
                              {job.title}
                            </Text>
                            <Text style={styles.draftMeta}>
                              {[job.category?.nameEn, job.zone?.nameEn]
                                .filter(Boolean)
                                .join(' · ')}{' '}
                              · {formatRelativeTime(job.createdAt, 'en')}
                            </Text>
                          </View>
                          <MaterialIcons name={Icons.edit as any} size={14} color={Colors.gray400} />
                        </View>

                        <View style={styles.draftActions}>
                          <TouchableOpacity
                            style={styles.continueDraftBtn}
                            onPress={() => handleContinueDraft(job)}
                            disabled={isDeleting}
                          >
                            <MaterialIcons name={Icons.chevronRight as any} size={16} color={Colors.primary600} />
                            <Text style={styles.continueDraftText}>
                              {t('homeowner.myJobs.continueDraft')}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteDraftBtn}
                            onPress={() => handleDeleteDraft(job)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color={Colors.danger600} />
                            ) : (
                              <MaterialIcons name={Icons.delete as any} size={16} color={Colors.danger600} />
                            )}
                            <Text style={styles.deleteDraftText}>
                              {t('homeowner.myJobs.deleteDraft')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </Card>
                    );
                  })}
                </>
              )}
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
  draftsLabel: {
    marginTop: Spacing.s1,
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

  // ── Draft card ──
  draftCard: {
    gap: Spacing.s3,
  },
  draftCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
  },
  draftInfo: {
    flex: 1,
    gap: 4,
  },
  draftTitle: {
    ...Typography.heading3,
    color: Colors.gray900,
  },
  draftMeta: {
    ...Typography.caption,
  },
  draftActions: {
    flexDirection: 'row',
    gap: Spacing.s3,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.s3,
  },
  continueDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    backgroundColor: Colors.primary50,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary100,
  },
  continueDraftText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary600,
  },
  deleteDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    backgroundColor: Colors.danger100,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.danger100,
  },
  deleteDraftText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger600,
  },
});
