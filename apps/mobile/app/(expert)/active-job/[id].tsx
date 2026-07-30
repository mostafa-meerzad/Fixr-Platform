import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
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
    firstName?: string;
    phone?: string;
  };
  acceptedBid?: {
    id: string;
    price: number;
    estimatedArrivalMinutes?: number;
    estimatedDurationHours?: number;
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

type NodeState = 'done' | 'current' | 'future';

function getNodeStates(status: JobStatus): [NodeState, NodeState, NodeState, NodeState] {
  switch (status) {
    case 'ASSIGNED':             return ['current', 'future', 'future', 'future'];
    case 'EN_ROUTE':             return ['done',    'current', 'future', 'future'];
    case 'ARRIVED':              return ['done',    'done',    'current', 'future'];
    case 'IN_PROGRESS':          return ['done',    'done',    'current', 'future'];
    case 'COMPLETION_REQUESTED': return ['done',    'done',    'done',    'current'];
    case 'COMPLETED':            return ['done',    'done',    'done',    'done'];
    case 'CANCELLED':            return ['done',    'done',    'done',    'done'];
    case 'DISPUTED':             return ['done',    'done',    'done',    'done'];
    default:                     return ['current', 'future', 'future', 'future'];
  }
}

function formatArrival(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `~${mins} min`;
  return `~${Math.round(mins / 60)}h`;
}

function formatDuration(hrs?: number): string {
  if (!hrs) return '—';
  if (hrs < 1) return `${Math.round(hrs * 60)} min`;
  return `${hrs}h`;
}

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
  const [completionLoading, setCompletionLoading] = useState(false);

  const pulseAnimRef = useRef(new Animated.Value(1));
  const animLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animLoopRef.current?.stop();
    if (!job) return;
    const states = getNodeStates(job.status);
    if (!states.some(s => s === 'current')) { pulseAnimRef.current.setValue(1); return; }
    pulseAnimRef.current.setValue(1);
    animLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimRef.current, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnimRef.current, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animLoopRef.current.start();
    return () => { animLoopRef.current?.stop(); };
  }, [job?.status]);

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
    try { await fetchJob(); } catch { }
    finally { setRefreshing(false); }
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
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
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
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
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
  const homeownerName = job.homeowner?.name ?? t('common.unknown');
  const homeownerFirstName =
    job.homeowner?.firstName ?? homeownerName.split(' ')[0] ?? homeownerName;
  const nodeStates = getNodeStates(job.status);
  const nodeLabels = [
    t('expert.activeJob.stepAccepted'),
    t('expert.activeJob.stepEnRoute'),
    t('expert.activeJob.stepWorking'),
    t('expert.activeJob.stepDone'),
  ];

  // ── Stepper ────────────────────────────────────────────────────────────────

  function renderNode(state: NodeState, index: number) {
    if (state === 'done') {
      return (
        <View style={styles.stepperNodeCol}>
          <View style={[styles.stepperNode, styles.stepperNodeDone]}>
            <MaterialCommunityIcons name={Icons.check as any} size={14} color={Colors.white} />
          </View>
          <Text style={[styles.nodeLabel, styles.nodeLabelDone]}>{nodeLabels[index]}</Text>
        </View>
      );
    }
    if (state === 'current') {
      return (
        <View style={styles.stepperNodeCol}>
          <Animated.View
            style={[
              styles.stepperNode,
              styles.stepperNodeCurrent,
              { transform: [{ scale: pulseAnimRef.current }] },
            ]}
          >
            <View style={styles.stepperNodeInnerDot} />
          </Animated.View>
          <Text style={[styles.nodeLabel, styles.nodeLabelCurrent]}>{nodeLabels[index]}</Text>
        </View>
      );
    }
    return (
      <View style={styles.stepperNodeCol}>
        <View style={[styles.stepperNode, styles.stepperNodeFuture]} />
        <Text style={[styles.nodeLabel, styles.nodeLabelFuture]}>{nodeLabels[index]}</Text>
      </View>
    );
  }

  // ── CTA ────────────────────────────────────────────────────────────────────

  function renderCTA() {
    switch (job!.status) {
      case 'ASSIGNED':
        return (
          <Button
            label={t('expert.activeJob.onMyWay')}
            variant="success"
            onPress={() => handleTransition(() => jobsService.markEnRoute(id))}
            loading={transitionLoading}
          />
        );
      case 'EN_ROUTE':
        return (
          <Button
            label={t('expert.activeJob.iArrived')}
            variant="success"
            onPress={() => handleTransition(() => jobsService.markArrived(id))}
            loading={transitionLoading}
          />
        );
      case 'ARRIVED':
        return (
          <Button
            label={t('expert.activeJob.startJob')}
            variant="success"
            onPress={() => handleTransition(() => jobsService.markInProgress(id))}
            loading={transitionLoading}
          />
        );
      case 'IN_PROGRESS':
        return (
          <Button
            label={t('expert.activeJob.markFinished')}
            variant="success"
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
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
          <Pill label={statusLabel} variant={getStatusVariant(job.status)} />
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
          {/* Homeowner contact card */}
          <View style={[styles.card, Shadows.sm]}>
            <View style={styles.contactRow}>
              <Avatar size={40} name={homeownerName} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{homeownerName}</Text>
                <Text style={styles.contactMeta} numberOfLines={1}>
                  {[job.address, job.zone.nameEn].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {job.homeowner?.phone ? (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${job.homeowner!.phone}`)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={Icons.phone as any} size={IconSize.inline} color={Colors.success600} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Status stepper card */}
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.cardHeading}>{t('expert.activeJob.updateStatus')}</Text>
            <View style={styles.stepperRow}>
              {nodeStates.map((state, i) => (
                <React.Fragment key={i}>
                  {renderNode(state, i)}
                  {i < 3 ? (
                    <View
                      style={[
                        styles.stepperLine,
                        { backgroundColor: state === 'done' ? Colors.primary600 : Colors.sand },
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Terminal state banners */}
          {job.status === 'CANCELLED' && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledBannerText}>{t('expert.activeJob.cancelledBanner')}</Text>
            </View>
          )}
          {job.status === 'DISPUTED' && (
            <View style={styles.disputedBanner}>
              <Text style={styles.disputedBannerText}>{t('expert.activeJob.disputedBanner')}</Text>
            </View>
          )}

          {/* Agreed terms card */}
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.cardHeading}>{t('expert.activeJob.agreedTerms')}</Text>
            <View style={styles.termsRow}>
              <View style={styles.termChip}>
                <Text style={styles.termValueAccent}>
                  {job.acceptedBid ? `${job.acceptedBid.price} AFN` : '—'}
                </Text>
                <Text style={styles.termLabel}>{t('expert.activeJob.priceLabel')}</Text>
              </View>
              <View style={styles.termChip}>
                <Text style={styles.termValue}>
                  {formatArrival(job.acceptedBid?.estimatedArrivalMinutes)}
                </Text>
                <Text style={styles.termLabel}>{t('expert.activeJob.arrivalLabel')}</Text>
              </View>
              <View style={styles.termChip}>
                <Text style={styles.termValue}>
                  {formatDuration(job.acceptedBid?.estimatedDurationHours)}
                </Text>
                <Text style={styles.termLabel}>{t('expert.activeJob.durationLabel')}</Text>
              </View>
              <View style={styles.termChip}>
                <Text style={styles.termValue} numberOfLines={1}>
                  {job.acceptedBid?.warrantyDescription ?? '—'}
                </Text>
                <Text style={styles.termLabel}>{t('expert.activeJob.warrantyLabel')}</Text>
              </View>
            </View>
          </View>

          {/* Hint row */}
          <View style={styles.hintRow}>
            <MaterialCommunityIcons name={Icons.info as any} size={14} color={Colors.gray400} style={styles.hintIcon} />
            <Text style={styles.hintText}>
              {t('expert.activeJob.finishedHint', { name: homeownerFirstName })}
            </Text>
          </View>

          {/* Raise dispute */}
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

      {/* Request Completion modal */}
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
        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.sheetTitle}>{t('expert.activeJob.completionSheetTitle')}</Text>
            <Text style={styles.sheetSubtitle}>{t('expert.activeJob.completionSheetSubtitle')}</Text>
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

const NODE_SIZE = 28;

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

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.s4,
    paddingBottom: 96,
    gap: Spacing.s3,
  },

  // ── Card base ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cardHeading: {
    ...Typography.heading3,
    marginBottom: Spacing.s3,
  },

  // ── Homeowner contact ───────────────────────────────────────────────────────
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...Typography.bodyMd,
  },
  contactMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stepper ─────────────────────────────────────────────────────────────────
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepperNodeCol: {
    alignItems: 'center',
    gap: Spacing.s1,
    minWidth: 52,
  },
  stepperNode: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNodeDone: {
    backgroundColor: Colors.primary600,
  },
  stepperNodeCurrent: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary600,
  },
  stepperNodeInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary600,
  },
  stepperNodeFuture: {
    backgroundColor: Colors.sand,
  },
  stepperLine: {
    flex: 1,
    height: 2,
    marginTop: (NODE_SIZE - 2) / 2,
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 52,
  },
  nodeLabelDone: {
    color: Colors.gray600,
  },
  nodeLabelCurrent: {
    color: Colors.primary600,
    fontWeight: '600',
  },
  nodeLabelFuture: {
    color: Colors.gray400,
  },

  // ── Agreed terms ────────────────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  termChip: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s1,
    alignItems: 'center',
    gap: 2,
  },
  termValueAccent: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary600,
  },
  termValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
  termLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.gray400,
  },

  // ── Hint row ─────────────────────────────────────────────────────────────────
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    backgroundColor: Colors.bgApp,
    borderRadius: Radius.sm,
    padding: Spacing.s3,
    borderWidth: 1,
    borderColor: Colors.sand,
  },
  hintIcon: {
    marginTop: 1,
  },
  hintText: {
    flex: 1,
    ...Typography.caption,
    lineHeight: 18,
  },

  // ── Terminal banners ─────────────────────────────────────────────────────────
  cancelledBanner: {
    backgroundColor: Colors.danger100,
    borderRadius: Radius.sm,
    padding: Spacing.s3,
  },
  cancelledBannerText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.danger600,
  },
  disputedBanner: {
    backgroundColor: Colors.warning100,
    borderRadius: Radius.sm,
    padding: Spacing.s3,
  },
  disputedBannerText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.warning600,
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
  sheetBtn: {
    marginTop: Spacing.s2,
  },
  sheetBtnSecondary: {
    marginTop: Spacing.s1,
  },
});
