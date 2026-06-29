import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { StatusTimeline } from '@/components/StatusTimeline';
import { jobsService, type JobStatus, type JobUrgency } from '@/services/jobs.service';

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
  urgency: JobUrgency;
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
  completedAt?: string;
}

const DISPUTABLE_STATUSES: JobStatus[] = [
  'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED',
];

const STATUS_LABEL_KEYS: Partial<Record<JobStatus, string>> = {
  ASSIGNED:             'common.status.assigned',
  EN_ROUTE:             'common.status.enRoute',
  ARRIVED:              'common.status.arrived',
  IN_PROGRESS:          'common.status.inProgress',
  COMPLETION_REQUESTED: 'common.status.completionRequested',
  COMPLETED:            'common.status.completed',
  CANCELLED:            'common.status.cancelled',
  DISPUTED:             'common.status.disputed',
};

// ─── Screen ────────────────────────────────────────────────────────────────────

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
    try {
      await fetchJob();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [fetchJob]);

  useEffect(() => { load(); }, [load]);

  const handleConfirmCompletion = useCallback(async () => {
    try {
      setConfirmLoading(true);
      await jobsService.confirmCompletion(id);
      show({ message: t('homeowner.activeJob.completionSuccess'), variant: 'success' });
      router.push(`/(shared)/review/${id}` as any);
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setConfirmLoading(false);
    }
  }, [id, show, t]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
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
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
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

  const statusLabel = t(STATUS_LABEL_KEYS[job.status] ?? 'common.unknown');
  const expert = job.acceptedBid?.expert;
  const isVerified = expert?.verificationStatus === 'VERIFIED';
  const isCompletionRequested = job.status === 'COMPLETION_REQUESTED';
  const isCompleted = job.status === 'COMPLETED';
  const canDispute = DISPUTABLE_STATUSES.includes(job.status);

  // ── CTA ────────────────────────────────────────────────────────────────────

  function renderCTA() {
    switch (job!.status) {
      case 'ASSIGNED':
      case 'EN_ROUTE':
        return (
          <View style={styles.waitingRow}>
            <Text style={styles.waitingText}>{t('homeowner.activeJob.waitingForExpert')}</Text>
          </View>
        );
      case 'ARRIVED':
      case 'IN_PROGRESS':
        return (
          <View style={styles.waitingRow}>
            <Text style={styles.waitingText}>{t('homeowner.activeJob.jobInProgress')}</Text>
          </View>
        );
      case 'COMPLETION_REQUESTED':
        return (
          <View style={styles.completionCTAs}>
            <Button
              label={t('homeowner.activeJob.confirmCompletion')}
              onPress={handleConfirmCompletion}
              loading={confirmLoading}
            />
            <TouchableOpacity
              style={styles.disputeCtaRow}
              onPress={() => router.push(`/(shared)/dispute/${id}` as any)}
            >
              <Text style={styles.disputeCtaText}>{t('homeowner.activeJob.raiseDisputeBtn')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 'COMPLETED':
        return (
          <Button
            label={t('homeowner.activeJob.leaveReview')}
            variant="secondary"
            onPress={() => router.push(`/(shared)/review/${id}` as any)}
          />
        );
      default:
        return null;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
          <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('homeowner.activeJob.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* COMPLETION_REQUESTED amber banner — pinned below header */}
      {isCompletionRequested ? (
        <View style={styles.completionBanner}>
          <MaterialIcons name={Icons.checkCircle as any} size={IconSize.inline} color={Colors.warning600} />
          <Text style={styles.completionBannerText}>{t('homeowner.activeJob.completionRequestedBanner')}</Text>
        </View>
      ) : null}

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary600}
          />
        }
      >
        {/* Job summary + expert card */}
        <Card style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
            <Pill label={statusLabel} variant={getStatusVariant(job.status)} />
          </View>

          {expert ? (
            <>
              <Text style={styles.sectionLabel}>{t('homeowner.activeJob.yourExpert')}</Text>

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
                    {isVerified ? (
                      <Text style={styles.verifiedBadge}>{t('homeowner.activeJob.verified')}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.expertMeta}>
                    {'★ '}{expert.rating?.toFixed(1) ?? '—'}{' · '}{expert.completedJobs}{' '}{t('homeowner.activeJob.jobsCompleted')}
                  </Text>
                </View>
                {job.acceptedBid?.price ? (
                  <Text style={styles.expertPrice}>
                    {job.acceptedBid.price.toLocaleString()} AFN
                  </Text>
                ) : null}
              </View>

              <Button
                label={t('homeowner.activeJob.messageExpert')}
                variant="secondary"
                leftIcon={Icons.tabChat}
                onPress={() => router.push(`/(shared)/chat/${id}` as any)}
                style={styles.messageBtn}
              />
            </>
          ) : null}
        </Card>

        {/* Status timeline */}
        <Card style={styles.card}>
          <StatusTimeline status={job.status} />
        </Card>

        {/* Expert's completion note (COMPLETION_REQUESTED only) */}
        {isCompletionRequested && job.acceptedBid?.expertMessage ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('homeowner.activeJob.expertNote')}</Text>
            <Text style={styles.body}>{job.acceptedBid.expertMessage}</Text>
          </Card>
        ) : null}

        {/* Warrant info (COMPLETED) */}
        {isCompleted && job.acceptedBid?.warrantyDescription ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('homeowner.activeJob.warranty')}</Text>
            <Text style={styles.body}>{job.acceptedBid.warrantyDescription}</Text>
          </Card>
        ) : null}

        {/* Raise dispute link in scroll */}
        {canDispute ? (
          <TouchableOpacity
            style={styles.disputeRow}
            onPress={() => router.push(`/(shared)/dispute/${id}` as any)}
          >
            <Text style={styles.disputeLink}>{t('homeowner.activeJob.raiseDispute')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Sticky CTA bar */}
      <View style={styles.ctaBar}>
        {renderCTA()}
      </View>
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

  // ── Completion banner ────────────────────────────────────────────────────────
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
    fontWeight: '500',
    color: Colors.warning600,
    lineHeight: 20,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.s4,
    paddingBottom: 104,
    gap: Spacing.s3,
  },

  // ── Cards ───────────────────────────────────────────────────────────────────
  card: {
    gap: Spacing.s3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.s3,
  },
  jobTitle: {
    flex: 1,
    ...Typography.heading2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    ...Typography.body,
    lineHeight: 22,
  },

  // ── Expert block ─────────────────────────────────────────────────────────────
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  expertInfo: {
    flex: 1,
  },
  expertNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  expertName: {
    ...Typography.bodyMd,
  },
  verifiedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success600,
  },
  expertMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
  expertPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary600,
  },
  messageBtn: {
    marginTop: Spacing.s1,
  },

  // ── Dispute link in scroll ───────────────────────────────────────────────────
  disputeRow: {
    alignItems: 'center',
    paddingVertical: Spacing.s3,
  },
  disputeLink: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger600,
  },

  // ── CTA bar ──────────────────────────────────────────────────────────────────
  ctaBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    padding: Spacing.s4,
  },
  waitingRow: {
    alignItems: 'center',
    paddingVertical: Spacing.s2,
  },
  waitingText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  completionCTAs: {
    gap: Spacing.s2,
  },
  disputeCtaRow: {
    alignItems: 'center',
    paddingVertical: Spacing.s2,
  },
  disputeCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger600,
  },
});
