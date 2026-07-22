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
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth.store';
import { jobsService, type Job, type JobListResponse } from '@/services/jobs.service';
import { formatRelativeTime } from '@/utils/format';

function getGreeting(t: (k: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('homeowner.home.greetingMorning');
  if (hour < 17) return t('homeowner.home.greetingAfternoon');
  return t('homeowner.home.greetingEvening');
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
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{getGreeting(t)}</Text>
          <Text style={styles.firstName}>{firstName}</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/(shared)/notifications' as any)}
          activeOpacity={0.7}
        >
          <MaterialIcons name={Icons.notifs as any} size={24} color={Colors.gray600} />
          <View style={styles.bellBadge} />
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
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero CTA card ── */}
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => router.push('/(homeowner)/post/create' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.heroLeft}>
              <View style={styles.heroPlusCircle}>
                <MaterialIcons name={Icons.add as any} size={20} color={Colors.primary600} />
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>{t('homeowner.home.postJob')}</Text>
                <Text style={styles.heroSubtitle}>{t('homeowner.home.postJobHint')}</Text>
              </View>
            </View>
            <MaterialIcons name={Icons.chevronRight as any} size={24} color={Colors.white} />
          </TouchableOpacity>

          {!hasContent ? (
            <EmptyState
              icon={Icons.homeRepair}
              title={t('homeowner.home.emptyTitle')}
              subtitle={t('homeowner.home.emptySubtitle')}
            />
          ) : (
            <>
              {/* ── Drafts ── */}
              {draftJobs.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t('homeowner.home.drafts')}</Text>

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
                          <View style={styles.draftPill}>
                            <Text style={styles.draftPillText}>{t('homeowner.home.draft')}</Text>
                          </View>
                        </View>

                        <View style={styles.draftActions}>
                          <TouchableOpacity
                            style={styles.continueDraftBtn}
                            onPress={() => handleContinueDraft(job)}
                            disabled={isDeleting}
                          >
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
                              <Text style={styles.deleteDraftText}>
                                {t('homeowner.myJobs.deleteDraft')}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </Card>
                    );
                  })}
                </>
              )}

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
                      {/* Title row */}
                      <View style={styles.cardRow}>
                        <Text style={styles.jobTitle} numberOfLines={2}>
                          {job.title}
                        </Text>
                        <Pill
                          label={getStatusLabel(job.status)}
                          variant={getStatusVariant(job.status)}
                        />
                      </View>

                      {/* Urgency + meta row */}
                      <View style={styles.cardRow}>
                        <View style={styles.metaLeft}>
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
                          <Text style={styles.jobMeta}>
                            {job.zone?.nameEn} · {formatRelativeTime(job.createdAt, 'en')}
                          </Text>
                        </View>
                        {job.status === 'OPEN' && (job._count?.bids ?? 0) > 0 && (
                          <View style={styles.bidCountPill}>
                            <Text style={styles.bidCountText}>
                              {job._count?.bids} {t('homeowner.home.bids')}
                            </Text>
                          </View>
                        )}
                        {job.status === 'COMPLETION_REQUESTED' && (
                          <View style={styles.confirmDonePill}>
                            <Text style={styles.confirmDoneText}>
                              {t('homeowner.home.confirmDone')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  ))}
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

  // ── Header ──
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray400,
    marginBottom: 2,
  },
  firstName: {
    ...Typography.display,
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger600,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  // ── Shared ──
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

  // ── Hero card ──
  heroCard: {
    backgroundColor: Colors.primary600,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    flex: 1,
  },
  heroPlusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
  },

  // ── Section labels ──
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
    marginTop: Spacing.s1,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary600,
  },

  // ── Job activity cards ──
  jobCard: {
    gap: Spacing.s2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.s2,
  },
  jobTitle: {
    ...Typography.heading3,
    flex: 1,
    marginRight: Spacing.s2,
  },
  metaLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  jobMeta: {
    ...Typography.caption,
  },
  bidCountPill: {
    backgroundColor: Colors.primary100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radius.full,
  },
  bidCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary600,
  },
  confirmDonePill: {
    backgroundColor: Colors.warning100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radius.full,
  },
  confirmDoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning600,
  },

  // ── Draft cards ──
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
  },
  draftMeta: {
    ...Typography.caption,
  },
  draftPill: {
    backgroundColor: Colors.gray100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radius.full,
  },
  draftPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.s3,
  },
  continueDraftBtn: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.dark,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueDraftText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  deleteDraftBtn: {
    paddingHorizontal: Spacing.s3,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteDraftText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger600,
  },
});
