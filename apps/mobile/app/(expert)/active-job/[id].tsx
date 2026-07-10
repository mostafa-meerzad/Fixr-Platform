import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Input } from '@/components/ui/Input';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { StatusTimeline } from '@/components/StatusTimeline';
import { jobsService, type JobStatus, type JobUrgency } from '@/services/jobs.service';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActiveJobDetail {
  id: string;
  title: string;
  status: JobStatus;
  urgency: JobUrgency;
  address: string;
  zone: { id: string; nameEn: string };
  category?: { id: string; nameEn: string };
  homeowner?: {
    id: string;
    name: string;
    phone?: string;
  };
  acceptedBid?: {
    id: string;
    price: number;
    warrantyDescription?: string;
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

export default function ExpertActiveJobScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [job, setJob] = useState<ActiveJobDetail | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionLoading, setCompletionLoading] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleTransition = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        setTransitionLoading(true);
        await action();
        await fetchJob();
      } catch {
        show({ message: t('common.error'), variant: 'error' });
      } finally {
        setTransitionLoading(false);
      }
    },
    [fetchJob, show, t],
  );

  const handleRequestCompletion = useCallback(async () => {
    try {
      setCompletionLoading(true);
      await jobsService.requestCompletion(id);
      setCompletionVisible(false);
      setCompletionNotes('');
      await fetchJob();
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setCompletionLoading(false);
    }
  }, [id, fetchJob, show, t]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
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
  const canDispute = DISPUTABLE_STATUSES.includes(job.status);

  // ── CTA ────────────────────────────────────────────────────────────────────

  function renderCTA() {
    switch (job!.status) {
      case 'ASSIGNED':
        return (
          <Button
            label={t('expert.activeJob.onMyWay')}
            leftIcon={Icons.location}
            onPress={() => handleTransition(() => jobsService.markEnRoute(id))}
            loading={transitionLoading}
          />
        );
      case 'EN_ROUTE':
        return (
          <Button
            label={t('expert.activeJob.iArrived')}
            onPress={() => handleTransition(() => jobsService.markArrived(id))}
            loading={transitionLoading}
          />
        );
      case 'ARRIVED':
        return (
          <Button
            label={t('expert.activeJob.startJob')}
            onPress={() => handleTransition(() => jobsService.markInProgress(id))}
            loading={transitionLoading}
          />
        );
      case 'IN_PROGRESS':
        return (
          <Button
            label={t('expert.activeJob.requestCompletion')}
            onPress={() => setCompletionVisible(true)}
          />
        );
      case 'COMPLETION_REQUESTED':
        return (
          <Button
            label={t('expert.activeJob.waitingConfirmation')}
            variant="secondary"
            disabled
            onPress={() => {}}
          />
        );
      case 'COMPLETED':
        return (
          <Button
            label={t('expert.activeJob.leaveReview')}
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
    <>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
          <View style={styles.headerSpacer} />
        </View>

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
          {/* Job summary card */}
          <Card style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
              <Pill label={statusLabel} variant={getStatusVariant(job.status)} />
            </View>

            {(job.category || job.urgency) ? (
              <Text style={styles.metaText}>
                {[job.category?.nameEn, job.urgency === 'EMERGENCY' ? t('homeowner.post.urgencyEmergency') : job.urgency === 'TODAY' ? t('homeowner.post.urgencyToday') : t('homeowner.post.urgencyScheduled')]
                  .filter(Boolean).join(' · ')}
              </Text>
            ) : null}

            <Divider />

            <Text style={styles.sectionLabel}>{t('expert.activeJob.homeownerLabel')}</Text>
            <Text style={styles.bodyMd}>{job.homeowner?.name ?? t('common.unknown')}</Text>
            {job.homeowner?.phone ? (
              <Text style={styles.body}>{job.homeowner.phone}</Text>
            ) : null}

            <Divider />

            <Text style={styles.sectionLabel}>{t('expert.activeJob.locationLabel')}</Text>
            <Text style={styles.body}>{job.zone.nameEn}</Text>
            <Text style={styles.body}>{job.address}</Text>
            <Button
              label={t('expert.activeJob.openInMaps')}
              variant="ghost"
              onPress={() =>
                Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`)
              }
              style={styles.mapsBtn}
            />
          </Card>

          {/* Status timeline */}
          <Card style={styles.card}>
            <StatusTimeline status={job.status} />
          </Card>

          {/* Message homeowner */}
          <Button
            label={t('expert.activeJob.messageHomeowner')}
            variant="secondary"
            leftIcon={Icons.tabChat}
            onPress={() => router.push(`/(shared)/chat/${id}` as any)}
          />

          {/* Raise dispute link */}
          {canDispute ? (
            <TouchableOpacity
              style={styles.disputeRow}
              onPress={() => router.push(`/(shared)/dispute/${id}` as any)}
            >
              <Text style={styles.disputeLink}>{t('expert.activeJob.raiseDispute')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* Sticky CTA bar */}
        <View style={styles.ctaBar}>
          {renderCTA()}
        </View>
      </SafeAreaView>

      {/* Request Completion modal — plain RN Modal so we can use the same
          Keyboard.addListener + marginBottom pattern as the Chat screen */}
      <Modal
        visible={completionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setCompletionVisible(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setCompletionVisible(false);
          }}
        />
       <View style={{ backgroundColor: "rgba(0,0,0,0.5)"}}>
         <View style={[styles.modalSheet, { marginBottom: kbHeight }]}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <Text style={styles.sheetTitle}>{t('expert.activeJob.completionSheetTitle')}</Text>
          <Text style={styles.sheetSubtitle}>{t('expert.activeJob.completionSheetSubtitle')}</Text>

          <View style={styles.notesLabelRow}>
            <Text style={styles.notesLabel}>{t('expert.activeJob.notesLabel')}</Text>
            <Text style={styles.notesOptional}>{t('expert.activeJob.notesOptional')}</Text>
          </View>
          <Input
            placeholder={t('expert.activeJob.notesPlaceholder')}
            value={completionNotes}
            onChangeText={setCompletionNotes}
            multiline
          />

          <Button
            label={t('expert.activeJob.sendCompletion')}
            onPress={handleRequestCompletion}
            loading={completionLoading}
            style={styles.sheetBtn}
          />
          <Button
            label={t('expert.activeJob.notYet')}
            variant="ghost"
            onPress={() => {
              Keyboard.dismiss();
              setCompletionVisible(false);
            }}
            style={styles.sheetBtnSecondary}
          />
        </View>
       </View>
      </Modal>
    </>
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

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.s4,
    paddingBottom: 96,
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
  metaText: {
    ...Typography.caption,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bodyMd: {
    ...Typography.bodyMd,
  },
  body: {
    ...Typography.body,
  },
  mapsBtn: {
    marginTop: Spacing.s1,
  },

  // ── Dispute link ────────────────────────────────────────────────────────────
  disputeRow: {
    alignItems: 'center',
    paddingVertical: Spacing.s3,
  },
  disputeLink: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger600,
  },

  // ── CTA bar ─────────────────────────────────────────────────────────────────
  ctaBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    padding: Spacing.s4,
  },

  // ── Completion modal ────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s6,
    gap: Spacing.s3,
  },
  modalHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray200,
    alignSelf: 'center',
    marginTop: Spacing.s3,
    marginBottom: Spacing.s1,
  },
  sheetTitle: {
    ...Typography.heading2,
  },
  sheetSubtitle: {
    ...Typography.body,
  },
  notesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notesOptional: {
    ...Typography.caption,
  },
  sheetBtn: {
    marginTop: Spacing.s2,
  },
  sheetBtnSecondary: {
    marginTop: Spacing.s1,
  },
});
