import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { jobsService, type JobStatus } from '@/services/jobs.service';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActiveJobExpert {
  id: string;
  rating: number;
  completedJobs: number;
  verificationStatus: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface ActiveJobDetail {
  id: string;
  title: string;
  status: JobStatus;
  address: string;
  zone: { id: string; nameEn: string };
  category?: { id: string; nameEn: string };
  acceptedBid?: {
    id: string;
    price: number;
    warrantyDescription?: string;
    expertMessage?: string;
    expert: ActiveJobExpert;
  } | null;
}

// ─── 4-step homeowner stepper ─────────────────────────────────────────────────

function getHomeownerStep(status: JobStatus): number {
  switch (status) {
    case 'ASSIGNED':             return 0;
    case 'EN_ROUTE':
    case 'ARRIVED':              return 1;
    case 'IN_PROGRESS':          return 2;
    case 'COMPLETION_REQUESTED': return 3;
    case 'COMPLETED':            return 4; // all nodes done
    default:                     return 0;
  }
}

function HomeownerStepper({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  const currentIdx = getHomeownerStep(status);

  const steps = [
    t('homeowner.activeJob.stepAssigned'),
    t('homeowner.activeJob.stepEnRoute'),
    t('homeowner.activeJob.stepWorking'),
    t('homeowner.activeJob.stepConfirm'),
  ];

  return (
    <View style={stepStyles.container}>
      {/* Circles + lines row */}
      <View style={stepStyles.circlesRow}>
        {steps.map((_, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isConfirmNode = i === 3;

          return (
            <React.Fragment key={i}>
              <View style={[
                stepStyles.circle,
                isDone
                  ? stepStyles.circleDone
                  : isCurrent && isConfirmNode
                    ? stepStyles.circleCurrentAmber
                    : isCurrent
                      ? stepStyles.circleCurrent
                      : stepStyles.circleFuture,
              ]}>
                {isDone && (
                  <MaterialCommunityIcons name="check" size={13} color={Colors.white} />
                )}
              </View>
              {i < steps.length - 1 && (
                <View style={[stepStyles.line, i < currentIdx && stepStyles.lineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels row */}
      <View style={stepStyles.labelsRow}>
        {steps.map((label, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isConfirmNode = i === 3;
          return (
            <View key={i} style={stepStyles.labelCol}>
              <Text style={[
                stepStyles.stepLabel,
                (isDone || isCurrent) && stepStyles.stepLabelActive,
                isCurrent && isConfirmNode && stepStyles.stepLabelAmber,
              ]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    gap: Spacing.s2,
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: Colors.primary600,
  },
  circleCurrent: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary600,
  },
  circleCurrentAmber: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.amber,
  },
  circleFuture: {
    backgroundColor: Colors.sand,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.gray200,
  },
  lineDone: {
    backgroundColor: Colors.primary600,
  },
  labelsRow: {
    flexDirection: 'row',
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray400,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: Colors.gray600,
    fontWeight: '600',
  },
  stepLabelAmber: {
    color: Colors.amber,
  },
});

// ─── Screen ────────────────────────────────────────────────────────────────────

const DISPUTABLE_STATUSES: JobStatus[] = [
  'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED',
];

export default function HomeownerActiveJobScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [job, setJob] = useState<ActiveJobDetail | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchJob = useCallback(async () => {
    const res = await jobsService.get(id);
    setJob(res.data as ActiveJobDetail);
  }, [id]);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      await fetchJob();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchJob]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchJob(); } catch { /* silent */ } finally { setRefreshing(false); }
  }, [fetchJob]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleConfirmCompletion = useCallback(async () => {
    try {
      setConfirmLoading(true);
      await jobsService.confirmCompletion(id);
      await fetchJob();
      show({ message: t('homeowner.activeJob.completionSuccess'), variant: 'success' });
      router.push(`/(shared)/review/${id}` as any);
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setConfirmLoading(false);
    }
  }, [id, fetchJob, show, t]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('homeowner.activeJob.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !job) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('homeowner.activeJob.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={load} style={styles.retryBtn} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const expert = job.acceptedBid?.expert;
  const isVerified = expert?.verificationStatus === 'VERIFIED';
  const isCompletionRequested = job.status === 'COMPLETION_REQUESTED';
  const isCompleted = job.status === 'COMPLETED';
  const canDispute = DISPUTABLE_STATUSES.includes(job.status);
  const expertFirstName = expert?.user.name.split(' ')[0] ?? '';

  // ── CTA ────────────────────────────────────────────────────────────────────

  function renderCTA() {
    if (isCompletionRequested) {
      return (
        <Button
          label={t('homeowner.activeJob.confirmCompletion')}
          variant="success"
          onPress={handleConfirmCompletion}
          loading={confirmLoading}
        />
      );
    }
    if (isCompleted) {
      return (
        <Button
          label={t('homeowner.activeJob.leaveReview')}
          variant="secondary"
          onPress={() => router.push(`/(shared)/review/${id}` as any)}
        />
      );
    }
    return null;
  }

  const cta = renderCTA();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
          <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
        {isCompletionRequested ? (
          <View style={styles.confirmDoneBadge}>
            <Text style={styles.confirmDoneBadgeText}>
              {t('homeowner.activeJob.confirmDoneBadge')}
            </Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Amber banner — COMPLETION_REQUESTED */}
      {isCompletionRequested && (
        <View style={styles.completionBanner}>
          <MaterialCommunityIcons name={Icons.warning as any} size={IconSize.inline} color={Colors.warning600} />
          <Text style={styles.completionBannerText}>
            {t('homeowner.activeJob.completionRequestedBanner', { name: expertFirstName })}
          </Text>
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary600} />
        }
      >
        {/* Expert card */}
        {expert && (
          <Card style={styles.expertCard}>
            <View style={styles.expertRow}>
              <Avatar
                size={40}
                name={expert.user.name}
                uri={expert.user.avatarUrl}
                verified={isVerified}
              />
              <View style={styles.expertInfo}>
                <View style={styles.expertNameRow}>
                  <Text style={styles.expertName}>{expert.user.name}</Text>
                  {isVerified && (
                    <MaterialCommunityIcons name={Icons.verified as any} size={14} color={Colors.success600} />
                  )}
                </View>
                <Text style={styles.expertMeta} numberOfLines={1}>
                  {'★ '}{expert.rating?.toFixed(1) ?? '—'}
                  {' · '}{expert.completedJobs}{' '}{t('homeowner.activeJob.jobsCompleted')}
                  {job.acceptedBid?.price
                    ? ' · ' + t('homeowner.activeJob.agreedPrice', {
                        price: job.acceptedBid.price.toLocaleString(),
                      })
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.messageChip}
                onPress={() => router.push(`/(shared)/chat/${id}` as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.messageChipText}>{t('homeowner.activeJob.messageBtn')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Job progress stepper */}
        <Card style={styles.progressCard}>
          <Text style={styles.progressHeading}>{t('homeowner.activeJob.jobProgress')}</Text>
          <HomeownerStepper status={job.status} />
        </Card>

        {/* Completion notes (COMPLETION_REQUESTED only) */}
        {isCompletionRequested && job.acceptedBid?.expertMessage && (
          <Card style={styles.notesCard}>
            <Text style={styles.notesHeading}>
              {t('homeowner.activeJob.completionNotesFrom', { name: expertFirstName })}
            </Text>
            <Text style={styles.notesBody}>"{job.acceptedBid.expertMessage}"</Text>
          </Card>
        )}

        {/* Warranty info (COMPLETED only) */}
        {isCompleted && job.acceptedBid?.warrantyDescription && (
          <Card style={styles.notesCard}>
            <Text style={styles.sectionLabel}>{t('homeowner.activeJob.warranty')}</Text>
            <Text style={styles.notesBody}>{job.acceptedBid.warrantyDescription}</Text>
          </Card>
        )}

        {/* Raise dispute link */}
        {canDispute && (
          <TouchableOpacity
            style={styles.disputeRow}
            onPress={() => router.push(`/(shared)/dispute/${id}` as any)}
            activeOpacity={0.6}
          >
            <Text style={styles.disputeLink}>
              {t('homeowner.activeJob.raiseDisputeFull')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sticky CTA bar (only when there's an action) */}
      {cta && (
        <View style={styles.ctaBar}>
          {cta}
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.heading1,
  },
  headerSpacer: {
    width: 32,
  },

  // "CONFIRM DONE" amber chip in header
  confirmDoneBadge: {
    backgroundColor: Colors.warning100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radius.full,
  },
  confirmDoneBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning600,
    letterSpacing: 0.5,
  },

  // ── Amber banner ────────────────────────────────────────────────────────────
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    backgroundColor: Colors.warning100,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning600,
  },
  completionBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning600,
    lineHeight: 20,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.s4,
    paddingBottom: Spacing.s12,
    gap: Spacing.s3,
  },

  // ── Expert card ─────────────────────────────────────────────────────────────
  expertCard: {
    gap: Spacing.s3,
  },
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  expertInfo: {
    flex: 1,
    gap: 3,
  },
  expertNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expertName: {
    ...Typography.bodyMd,
  },
  expertMeta: {
    ...Typography.caption,
  },
  // Compact "Message" outlined pill button
  messageChip: {
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    paddingVertical: 6,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  messageChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary600,
  },

  // ── Job progress card ────────────────────────────────────────────────────────
  progressCard: {
    gap: Spacing.s4,
  },
  progressHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray900,
  },

  // ── Notes / warranty card ────────────────────────────────────────────────────
  notesCard: {
    gap: Spacing.s2,
  },
  notesHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray900,
  },
  notesBody: {
    ...Typography.body,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Dispute link ─────────────────────────────────────────────────────────────
  disputeRow: {
    alignItems: 'center',
    paddingVertical: Spacing.s3,
  },
  disputeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary600,
    textDecorationLine: 'underline',
  },

  // ── Sticky CTA bar ───────────────────────────────────────────────────────────
  ctaBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    padding: Spacing.s4,
  },
});
