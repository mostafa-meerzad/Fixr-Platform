import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Input } from '@/components/ui/Input';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { bidsService } from '@/services/bids.service';
import { jobsService, type JobStatus, type JobUrgency } from '@/services/jobs.service';
import { usersService, type PublicExpertProfile } from '@/services/users.service';
import { formatRelativeTime } from '@/utils/format';

const SCREEN_W = Dimensions.get('window').width;

// ─── Status label map ─────────────────────────────────────────────────────────

const STATUS_T_KEYS: Record<string, string> = {
  OPEN: 'homeowner.jobDetail.statusOpen',
  ASSIGNED: 'common.status.assigned',
  EN_ROUTE: 'common.status.enRoute',
  ARRIVED: 'common.status.arrived',
  IN_PROGRESS: 'common.status.inProgress',
  COMPLETION_REQUESTED: 'common.status.completionRequested',
  COMPLETED: 'common.status.completed',
  CANCELLED: 'common.status.cancelled',
  DISPUTED: 'common.status.disputed',
};

// ─── Local types ───────────────────────────────────────────────────────────────

interface JobMedia {
  id: string;
  url: string;
  type: string;
}

interface BidExpert {
  id: string;
  rating: number;
  completedJobs: number;
  positivePoints: number;
  negativePoints: number;
  verificationStatus: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface Bid {
  id: string;
  price: number;
  estimatedArrivalMinutes: number;
  estimatedDurationHours: number;
  warrantyDescription?: string;
  expertMessage?: string;
  isWithdrawn: boolean;
  expert: BidExpert;
}

interface AcceptedBid {
  id: string;
  price: number;
  estimatedArrivalMinutes: number;
  estimatedDurationHours: number;
  warrantyDescription?: string;
  expert: {
    id: string;
    verificationStatus: string;
    rating: number;
    completedJobs: number;
    user: { id: string; name: string; avatarUrl: string | null };
  };
}

interface JobDetail {
  id: string;
  title: string;
  status: JobStatus;
  urgency: JobUrgency;
  address: string;
  description?: string;
  zone: { id: string; nameEn: string; name: string };
  category?: { id: string; nameEn: string; name: string };
  media: JobMedia[];
  _count: { bids: number };
  createdAt: string;
  openedAt?: string;
  homeowner?: {
    id: string;
    name: string;
    phone?: string;
    avatarUrl?: string | null;
  };
  acceptedBid?: AcceptedBid | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getUrgencyLabel(urgency: JobUrgency): string {
  if (urgency === 'EMERGENCY') return 'Emergency';
  if (urgency === 'TODAY') return 'Today';
  return 'Scheduled';
}

function getUrgencyVariant(urgency: JobUrgency): 'danger' | 'warning' | 'gray' {
  if (urgency === 'EMERGENCY') return 'danger';
  if (urgency === 'TODAY') return 'warning';
  return 'gray';
}

const ASSIGNED_PLUS: JobStatus[] = [
  'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED',
];

// ─── BidCard ───────────────────────────────────────────────────────────────────

interface BidCardProps {
  bid: Bid;
  onAccept: () => void;
  onViewExpert: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function BidCard({ bid, onAccept, onViewExpert, t }: BidCardProps) {
  const isVerified = bid.expert.verificationStatus === 'VERIFIED';

  return (
    <Card style={styles.bidCard}>
      {/* Expert + price row */}
      <TouchableOpacity style={styles.bidTopRow} onPress={onViewExpert} activeOpacity={0.7}>
        <Avatar
          size={40}
          name={bid.expert.user.name}
          uri={bid.expert.user.avatarUrl}
          verified={isVerified}
        />
        <View style={styles.bidExpertInfo}>
          <View style={styles.bidNameRow}>
            <Text style={styles.bidExpertName} numberOfLines={1}>{bid.expert.user.name}</Text>
            {isVerified && (
              <MaterialIcons name={Icons.verified as any} size={14} color={Colors.success600} />
            )}
          </View>
          <Text style={styles.bidExpertMeta}>
            ★ {bid.expert.rating?.toFixed(1) ?? '—'} · {bid.expert.completedJobs} {t('homeowner.jobDetail.jobsCompleted')}
          </Text>
        </View>
        <View style={styles.bidPriceBlock}>
          <Text style={styles.bidPrice}>{bid.price.toLocaleString()} AFN</Text>
          <Text style={styles.bidArrivalText}>
            ~{bid.estimatedArrivalMinutes}min · {bid.estimatedDurationHours}h
          </Text>
        </View>
      </TouchableOpacity>

      {/* Warranty chip */}
      {bid.warrantyDescription ? (
        <View style={styles.warrantyRow}>
          <MaterialIcons name={Icons.checkCircle as any} size={12} color={Colors.success600} />
          <Text style={styles.warrantyText} numberOfLines={1}>
            {t('homeowner.jobDetail.warranty')} · {bid.warrantyDescription}
          </Text>
        </View>
      ) : null}

      {/* Expert message */}
      {bid.expertMessage ? (
        <Text style={styles.bidMessage} numberOfLines={2}>{bid.expertMessage}</Text>
      ) : null}

      <Button
        label={t('homeowner.jobDetail.acceptBid')}
        onPress={onAccept}
        style={styles.bidAcceptBtn}
      />
    </Card>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function HomeownerJobDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();

  const acceptSheetRef = useRef<BottomSheetModal>(null);
  const cancelSheetRef = useRef<BottomSheetModal>(null);
  const expertSheetRef = useRef<BottomSheetModal>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'arrival'>('price');
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [viewingExpertBid, setViewingExpertBid] = useState<Bid | null>(null);
  const [expertProfile, setExpertProfile] = useState<PublicExpertProfile | null>(null);
  const [expertProfileLoading, setExpertProfileLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const res = await jobsService.get(id);
      const jobData = res.data as JobDetail;
      setJob(jobData);

      if (jobData.status === 'OPEN') {
        setBidsLoading(true);
        try {
          const bidsRes = await bidsService.listForJob(id);
          setBids((bidsRes.data as Bid[]).filter((b) => !b.isWithdrawn));
        } finally {
          setBidsLoading(false);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sortedBids = [...bids].sort((a, b) =>
    sortBy === 'price'
      ? a.price - b.price
      : a.estimatedArrivalMinutes - b.estimatedArrivalMinutes,
  );

  const handleOpenAcceptSheet = (bid: Bid) => {
    setSelectedBid(bid);
    acceptSheetRef.current?.present();
  };

  const handleConfirmAccept = async () => {
    if (!selectedBid || !job) return;
    try {
      setAcceptLoading(true);
      await bidsService.accept(job.id, selectedBid.id);
      acceptSheetRef.current?.dismiss();
      show({
        message: t('homeowner.jobDetail.chatNowWith', { name: selectedBid.expert.user.name }),
        variant: 'success',
      });
      router.replace(`/(homeowner)/active-job/${id}` as any);
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job) return;
    try {
      setCancelLoading(true);
      await jobsService.cancel(job.id, cancelReason);
      cancelSheetRef.current?.dismiss();
      show({ message: t('homeowner.jobDetail.cancelSuccess'), variant: 'success' });
      router.back();
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleViewExpert = async (bid: Bid) => {
    setViewingExpertBid(bid);
    setExpertProfile(null);
    expertSheetRef.current?.present();
    setExpertProfileLoading(true);
    try {
      const res = await usersService.getExpertProfile(bid.expert.user.id);
      setExpertProfile(res.data as PublicExpertProfile);
    } catch {
      // expertProfile stays null — sheet shows error state
    } finally {
      setExpertProfileLoading(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

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

  // ── Error ───────────────────────────────────────────────────────────────────

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

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isOpen = job.status === 'OPEN';
  const isAssignedPlus = ASSIGNED_PLUS.includes(job.status);
  const isCompleted = job.status === 'COMPLETED';
  const images = job.media.filter((m) => m.type === 'image');
  const statusLabel = t(STATUS_T_KEYS[job.status] ?? job.status);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* ── Hero carousel or placeholder ── */}
          {images.length > 0 ? (
            <View style={styles.imageContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width,
                  );
                  setImageIndex(idx);
                }}
              >
                {images.map((m) => (
                  <Image
                    key={m.id}
                    source={{ uri: m.url }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.dots}>
                  {images.map((_, idx) => (
                    <View
                      key={idx}
                      style={[styles.dot, idx === imageIndex ? styles.dotActive : styles.dotInactive]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons
                name={(job.category ? Icons.assignment : Icons.image) as any}
                size={IconSize.large}
                color={Colors.primary600}
              />
            </View>
          )}

          {/* ── White content card ── */}
          <View style={styles.contentCard}>
            {/* Title + status pill */}
            <View style={styles.titleRow}>
              <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
              <Pill label={statusLabel} variant={getStatusVariant(job.status)} />
            </View>

            {/* Urgency badge + category · zone · time-ago */}
            <View style={styles.metaRow}>
              <Pill label={getUrgencyLabel(job.urgency)} variant={getUrgencyVariant(job.urgency)} />
              <Text style={styles.metaText} numberOfLines={1}>
                {job.category ? `${job.category.nameEn} · ` : ''}
                {job.zone.nameEn} · {formatRelativeTime(job.createdAt, 'en')}
              </Text>
            </View>

            {/* Description */}
            {job.description ? (
              <Text style={styles.bodyText}>{job.description}</Text>
            ) : null}

            {/* Address row */}
            <View style={styles.addressRow}>
              <MaterialIcons name={Icons.location as any} size={IconSize.status} color={Colors.gray400} />
              <Text style={styles.addressText}>{job.address}</Text>
            </View>

            {/* ── Assigned expert block (non-OPEN) ── */}
            {job.acceptedBid && (
              <>
                <Divider />
                <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.yourExpert')}</Text>
                <Card variant="accepted" style={styles.expertCard}>
                  <View style={styles.expertRow}>
                    <Avatar
                      size={40}
                      name={job.acceptedBid.expert.user.name}
                      uri={job.acceptedBid.expert.user.avatarUrl}
                      verified={job.acceptedBid.expert.verificationStatus === 'VERIFIED'}
                    />
                    <View style={styles.expertInfo}>
                      <Text style={styles.expertName}>{job.acceptedBid.expert.user.name}</Text>
                      <Text style={styles.expertMeta}>
                        ★ {job.acceptedBid.expert.rating?.toFixed(1) ?? '—'} · {job.acceptedBid.expert.completedJobs} {t('homeowner.jobDetail.jobsCompleted')}
                      </Text>
                    </View>
                    <Text style={styles.expertPrice}>
                      {job.acceptedBid.price.toLocaleString()} AFN
                    </Text>
                  </View>

                  <View style={styles.chipRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        ~{job.acceptedBid.estimatedArrivalMinutes}min {t('homeowner.jobDetail.arrival')}
                      </Text>
                    </View>
                    {job.acceptedBid.warrantyDescription ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{job.acceptedBid.warrantyDescription}</Text>
                      </View>
                    ) : null}
                  </View>

                  {isAssignedPlus && (
                    <Button
                      label={t('homeowner.jobDetail.messageExpert', {
                        name: job.acceptedBid.expert.user.name.split(' ')[0],
                      })}
                      leftIcon={Icons.tabChat}
                      onPress={() => router.push(`/(shared)/chat/${id}` as any)}
                      style={styles.expertActionBtn}
                    />
                  )}
                  {isCompleted && (
                    <Button
                      label={t('homeowner.jobDetail.leaveReview')}
                      variant="ghost"
                      onPress={() => router.push(`/(shared)/review/${id}` as any)}
                      style={styles.expertActionBtn}
                    />
                  )}
                </Card>
              </>
            )}

            {/* ── Bids section (OPEN only) ── */}
            {isOpen && (
              <>
                <Divider />

                {/* Bids header + sort row */}
                <View style={styles.bidsHeader}>
                  <View style={styles.bidsHeaderLeft}>
                    <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.bidsReceived')}</Text>
                    <View style={styles.countChip}>
                      <Text style={styles.countText}>{bids.length}</Text>
                    </View>
                  </View>
                  <View style={styles.sortRow}>
                    <TouchableOpacity
                      style={[styles.sortBtn, sortBy === 'price' ? styles.sortBtnActive : styles.sortBtnInactive]}
                      onPress={() => setSortBy('price')}
                    >
                      <Text style={[styles.sortText, sortBy === 'price' ? styles.sortTextActive : styles.sortTextInactive]}>
                        {t('homeowner.jobDetail.sortPrice')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortBtn, sortBy === 'arrival' ? styles.sortBtnActive : styles.sortBtnInactive]}
                      onPress={() => setSortBy('arrival')}
                    >
                      <Text style={[styles.sortText, sortBy === 'arrival' ? styles.sortTextActive : styles.sortTextInactive]}>
                        {t('homeowner.jobDetail.sortArrival')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {bidsLoading ? (
                  <View style={styles.bidsLoading}>
                    <ActivityIndicator color={Colors.primary600} />
                  </View>
                ) : sortedBids.length === 0 ? (
                  <View style={styles.bidsLoading}>
                    <Text style={styles.emptyText}>{t('homeowner.jobDetail.noBids')}</Text>
                  </View>
                ) : (
                  <View style={styles.bidsList}>
                    {sortedBids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        onAccept={() => handleOpenAcceptSheet(bid)}
                        onViewExpert={() => handleViewExpert(bid)}
                        t={t}
                      />
                    ))}
                  </View>
                )}

                {/* Cancel job text link */}
                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => cancelSheetRef.current?.present()}
                  activeOpacity={0.6}
                >
                  <Text style={styles.cancelLinkText}>{t('homeowner.jobDetail.cancelJob')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Accept bid confirmation sheet ── */}
      <BottomSheet
        ref={acceptSheetRef}
        snapPoints={['60%']}
        onDismiss={() => setSelectedBid(null)}
      >
        {selectedBid && (
          <View style={styles.sheetContent}>
            <View style={styles.sheetAvatarRow}>
              <Avatar
                size={56}
                name={selectedBid.expert.user.name}
                uri={selectedBid.expert.user.avatarUrl}
                verified={selectedBid.expert.verificationStatus === 'VERIFIED'}
              />
            </View>
            <Text style={styles.sheetExpertName}>{selectedBid.expert.user.name}</Text>
            {selectedBid.expert.verificationStatus === 'VERIFIED' && (
              <View style={styles.sheetVerifiedRow}>
                <MaterialIcons name={Icons.verified as any} size={14} color={Colors.success600} />
                <Text style={styles.sheetVerifiedText}>{t('homeowner.jobDetail.verifiedExpert')}</Text>
              </View>
            )}
            <Text style={styles.sheetPrice}>
              {selectedBid.price.toLocaleString()} AFN
            </Text>
            <Text style={styles.sheetArrival}>
              ~{selectedBid.estimatedArrivalMinutes}min {t('homeowner.jobDetail.arrival')}
            </Text>
            {selectedBid.estimatedDurationHours ? (
              <Text style={styles.sheetDuration}>
                ~{selectedBid.estimatedDurationHours} hrs
              </Text>
            ) : null}
            <Divider style={styles.sheetDivider} />
            <Text style={styles.sheetMessage}>{t('homeowner.jobDetail.confirmMessage')}</Text>
            <Button
              label={t('homeowner.jobDetail.confirmAccept')}
              onPress={handleConfirmAccept}
              loading={acceptLoading}
              style={styles.sheetBtn}
            />
            <Button
              label={t('homeowner.jobDetail.goBack')}
              variant="ghost"
              onPress={() => acceptSheetRef.current?.dismiss()}
              style={styles.sheetBtnSecondary}
            />
          </View>
        )}
      </BottomSheet>

      {/* ── Cancel job sheet ── */}
      <BottomSheet ref={cancelSheetRef} snapPoints={['50%']}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>{t('homeowner.jobDetail.cancelJob')}</Text>
          <Input
            label={t('homeowner.jobDetail.cancelReason')}
            placeholder={t('homeowner.jobDetail.cancelReasonPlaceholder')}
            value={cancelReason}
            onChangeText={setCancelReason}
            multiline
          />
          <Button
            label={t('homeowner.jobDetail.cancelConfirm')}
            variant="destructive"
            onPress={handleCancelJob}
            loading={cancelLoading}
            style={styles.sheetBtn}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => cancelSheetRef.current?.dismiss()}
            style={styles.sheetBtnSecondary}
          />
        </View>
      </BottomSheet>

      {/* ── Expert profile sheet ── */}
      <BottomSheet
        ref={expertSheetRef}
        snapPoints={['75%']}
        scrollable
        onDismiss={() => { setViewingExpertBid(null); setExpertProfile(null); }}
      >
        {expertProfileLoading ? (
          <View style={styles.sheetCentered}>
            <ActivityIndicator size="large" color={Colors.primary600} />
          </View>
        ) : !expertProfile ? (
          <View style={styles.sheetCentered}>
            <Text style={styles.errorText}>{t('common.error')}</Text>
          </View>
        ) : (
          <View style={styles.expertSheetContent}>
            {/* Avatar + name + verification */}
            <View style={styles.expertSheetHero}>
              <Avatar
                size={56}
                name={expertProfile.user.name}
                uri={expertProfile.user.avatarUrl}
                verified={expertProfile.verificationStatus === 'VERIFIED'}
              />
              <Text style={styles.expertSheetName}>{expertProfile.user.name}</Text>
              <View style={[
                styles.verificationPill,
                expertProfile.verificationStatus === 'VERIFIED' ? styles.verificationPillVerified : styles.verificationPillPending,
              ]}>
                <Text style={[
                  styles.verificationPillText,
                  expertProfile.verificationStatus === 'VERIFIED' ? styles.verificationPillTextVerified : styles.verificationPillTextPending,
                ]}>
                  {expertProfile.verificationStatus === 'VERIFIED'
                    ? t('homeowner.jobDetail.verifiedExpert')
                    : t('homeowner.jobDetail.pendingVerification')}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.expertSheetStats}>
              <View style={styles.expertSheetStatItem}>
                <MaterialIcons name={Icons.star as any} size={16} color={Colors.primary600} />
                <Text style={styles.expertSheetStatValue}>
                  {expertProfile.rating?.toFixed(1) ?? '—'}
                </Text>
              </View>
              <View style={styles.expertSheetStatDivider} />
              <Text style={styles.expertSheetStatLabel}>
                {expertProfile.completedJobs} {t('homeowner.jobDetail.jobsCompleted')}
              </Text>
              {expertProfile.positivePoints > 0 && (
                <>
                  <View style={styles.expertSheetStatDivider} />
                  <View style={styles.expertSheetStatItem}>
                    <MaterialIcons name={Icons.thumbUp as any} size={14} color={Colors.success600} />
                    <Text style={styles.expertSheetStatLabel}>
                      {expertProfile.positivePoints}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* No-show warning */}
            {expertProfile.noShowCount > 0 && (
              <View style={styles.noShowRow}>
                <MaterialIcons name={Icons.noShow as any} size={IconSize.status} color={Colors.danger600} />
                <Text style={styles.noShowText}>
                  {t('homeowner.jobDetail.noShowCount', { count: expertProfile.noShowCount })}
                </Text>
              </View>
            )}

            <Divider />

            {expertProfile.shopName ? (
              <View style={styles.expertSheetSection}>
                <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.shopLabel')}</Text>
                <Text style={styles.expertSheetSectionValue}>{expertProfile.shopName}</Text>
              </View>
            ) : null}

            {expertProfile.description ? (
              <View style={styles.expertSheetSection}>
                <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.aboutLabel')}</Text>
                <Text style={styles.expertSheetDescription}>{expertProfile.description}</Text>
              </View>
            ) : null}

            {expertProfile.serviceCategories.length > 0 && (
              <View style={styles.expertSheetSection}>
                <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.servicesLabel')}</Text>
                <View style={styles.expertSheetPillRow}>
                  {expertProfile.serviceCategories.map((sc) => (
                    <View key={sc.category.id} style={styles.expertSheetPill}>
                      <Text style={styles.expertSheetPillText}>{sc.category.nameEn}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {expertProfile.serviceZones.length > 0 && (
              <View style={styles.expertSheetSection}>
                <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.zonesLabel')}</Text>
                <View style={styles.expertSheetPillRow}>
                  {expertProfile.serviceZones.map((sz) => (
                    <View key={sz.zone.id} style={styles.expertSheetPill}>
                      <Text style={styles.expertSheetPillText}>{sz.zone.nameEn}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {viewingExpertBid && isOpen && (
              <>
                <Divider />
                <Button
                  label={`${t('homeowner.jobDetail.acceptBid')} · ${viewingExpertBid.price.toLocaleString()} AFN`}
                  onPress={() => {
                    expertSheetRef.current?.dismiss();
                    handleOpenAcceptSheet(viewingExpertBid);
                  }}
                  style={styles.sheetBtn}
                />
              </>
            )}
          </View>
        )}
      </BottomSheet>
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
    flexGrow: 1,
    paddingBottom: Spacing.s8,
  },

  // ── Hero image ───────────────────────────────────────────────────────────────
  imageContainer: {
    height: 220,
    backgroundColor: Colors.gray100,
  },
  image: {
    width: SCREEN_W,
    height: 220,
  },
  dots: {
    position: 'absolute',
    bottom: Spacing.s3,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.s1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.white,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Content card ─────────────────────────────────────────────────────────────
  contentCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -16,
    padding: Spacing.s4,
    gap: Spacing.s3,
    flex: 1,
  },

  // Title + status pill
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.s3,
  },
  jobTitle: {
    flex: 1,
    ...Typography.heading1,
  },

  // Urgency + category · zone · time
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  metaText: {
    ...Typography.caption,
    flex: 1,
  },

  // Description
  bodyText: {
    ...Typography.body,
    lineHeight: 22,
  },

  // Address row
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s1,
  },
  addressText: {
    ...Typography.caption,
    flex: 1,
  },

  // Section label (teal uppercase)
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Expert block (assigned) ──────────────────────────────────────────────────
  expertCard: {
    gap: Spacing.s2,
  },
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  expertInfo: {
    flex: 1,
  },
  expertName: {
    ...Typography.bodyMd,
  },
  expertMeta: {
    ...Typography.caption,
  },
  expertPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: Colors.gray100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray600,
  },
  expertActionBtn: {
    marginTop: Spacing.s2,
  },

  // ── Bids section ─────────────────────────────────────────────────────────────
  bidsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  countChip: {
    backgroundColor: Colors.primary100,
    minWidth: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary600,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.s1,
  },
  sortBtn: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary600,
  },
  sortBtnInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortTextActive: {
    color: Colors.white,
  },
  sortTextInactive: {
    color: Colors.gray600,
  },
  bidsLoading: {
    paddingVertical: Spacing.s6,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  bidsList: {
    gap: Spacing.s3,
  },

  // ── Bid card ─────────────────────────────────────────────────────────────────
  bidCard: {
    gap: Spacing.s2,
  },
  // Expert info + price in a horizontal row
  bidTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s3,
  },
  bidExpertInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  bidNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidExpertName: {
    ...Typography.bodyMd,
    flex: 1,
  },
  bidExpertMeta: {
    ...Typography.caption,
  },
  bidPriceBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  bidPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
  },
  bidArrivalText: {
    ...Typography.caption,
    textAlign: 'right',
  },

  // Warranty row
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s1,
    backgroundColor: Colors.success100,
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.sm,
  },
  warrantyText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success600,
    flex: 1,
  },

  // Expert message
  bidMessage: {
    ...Typography.body,
    fontSize: 13,
  },

  // Accept bid button
  bidAcceptBtn: {
    marginTop: Spacing.s1,
  },

  // Cancel link
  cancelLink: {
    alignItems: 'center',
    paddingVertical: Spacing.s3,
    marginTop: Spacing.s2,
  },
  cancelLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary600,
  },

  // ── Bottom sheets ─────────────────────────────────────────────────────────────
  sheetContent: {
    gap: Spacing.s2,
    alignItems: 'stretch',
  },
  sheetAvatarRow: {
    alignItems: 'center',
    marginBottom: Spacing.s2,
  },
  sheetExpertName: {
    ...Typography.heading2,
    textAlign: 'center',
  },
  sheetVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sheetVerifiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success600,
  },
  sheetPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary600,
    textAlign: 'center',
    marginTop: Spacing.s2,
  },
  sheetArrival: {
    ...Typography.body,
    textAlign: 'center',
  },
  sheetDuration: {
    ...Typography.caption,
    textAlign: 'center',
  },
  sheetDivider: {
    marginVertical: Spacing.s4,
  },
  sheetMessage: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.gray600,
  },
  sheetBtn: {
    marginTop: Spacing.s4,
  },
  sheetBtnSecondary: {
    marginTop: Spacing.s1,
  },
  sheetTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.s2,
  },

  // Expert profile sheet
  sheetCentered: {
    paddingVertical: Spacing.s10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s3,
  },
  expertSheetContent: {
    gap: Spacing.s4,
  },
  expertSheetHero: {
    alignItems: 'center',
    gap: Spacing.s2,
  },
  expertSheetName: {
    ...Typography.heading2,
    textAlign: 'center',
  },
  verificationPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  verificationPillVerified: {
    backgroundColor: Colors.success100,
  },
  verificationPillPending: {
    backgroundColor: Colors.warning100,
  },
  verificationPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verificationPillTextVerified: {
    color: Colors.success600,
  },
  verificationPillTextPending: {
    color: Colors.warning600,
  },
  expertSheetStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s3,
  },
  expertSheetStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expertSheetStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray900,
  },
  expertSheetStatLabel: {
    ...Typography.caption,
  },
  expertSheetStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.gray200,
  },
  noShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: Colors.danger100,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.sm,
  },
  noShowText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger600,
  },
  expertSheetSection: {
    gap: Spacing.s2,
  },
  expertSheetSectionValue: {
    ...Typography.bodyMd,
  },
  expertSheetDescription: {
    ...Typography.body,
    lineHeight: 22,
  },
  expertSheetPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  expertSheetPill: {
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary100,
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  expertSheetPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary600,
  },
});
