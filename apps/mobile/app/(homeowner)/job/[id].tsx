import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
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
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { bidsService } from '@/services/bids.service';
import { jobsService, type JobStatus, type JobUrgency } from '@/services/jobs.service';
import { formatRelativeTime } from '@/utils/format';

const SCREEN_W = Dimensions.get('window').width;

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

// ─── Helper ────────────────────────────────────────────────────────────────────

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
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function BidCard({ bid, onAccept, t }: BidCardProps) {
  const isVerified = bid.expert.verificationStatus === 'VERIFIED';
  return (
    <Card style={styles.bidCard}>
      {/* Expert row */}
      <View style={styles.bidExpertRow}>
        <Avatar
          size={40}
          name={bid.expert.user.name}
          uri={bid.expert.user.avatarUrl}
          verified={isVerified}
        />
        <View style={styles.bidExpertInfo}>
          <View style={styles.bidNameRow}>
            <Text style={styles.bidExpertName}>{bid.expert.user.name}</Text>
            {isVerified && (
              <View style={styles.verifiedRow}>
                <MaterialIcons name={Icons.verified as any} size={IconSize.status} color={Colors.success600} />
                <Text style={styles.verifiedText}>{t('homeowner.jobDetail.verified')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.bidExpertMeta}>
            ★ {bid.expert.rating?.toFixed(1) ?? '—'} · {bid.expert.completedJobs} {t('homeowner.jobDetail.jobsCompleted')}
          </Text>
        </View>
        <Text style={styles.bidRating}>
          ★ {bid.expert.rating?.toFixed(1) ?? '—'}
        </Text>
      </View>

      {/* Price + arrival */}
      <View style={styles.bidPriceRow}>
        <Text style={styles.bidPrice}>AFN {bid.price.toLocaleString()}</Text>
        <Text style={styles.bidArrival}>
          ~{bid.estimatedArrivalMinutes}min {t('homeowner.jobDetail.arrival')}
        </Text>
      </View>

      {/* Chips */}
      <View style={styles.bidChipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{bid.estimatedDurationHours}hrs est.</Text>
        </View>
        {bid.warrantyDescription ? (
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>{bid.warrantyDescription}</Text>
          </View>
        ) : null}
      </View>

      {bid.expertMessage ? (
        <Text style={styles.bidMessage} numberOfLines={2}>{bid.expertMessage}</Text>
      ) : null}

      <Button
        label={t('homeowner.jobDetail.acceptBid')}
        onPress={onAccept}
        style={{ marginTop: Spacing.s3 }}
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

  useEffect(() => { load(); }, [load]);

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
          {/* ── Image / placeholder ── */}
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
            {/* Title */}
            <Text style={styles.jobTitle}>{job.title}</Text>

            {/* Category chip + urgency pill */}
            <View style={styles.rowBetween}>
              {job.category ? (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{job.category.nameEn}</Text>
                </View>
              ) : (
                <View />
              )}
              <Pill label={getUrgencyLabel(job.urgency)} variant={getUrgencyVariant(job.urgency)} />
            </View>

            {/* Zone + time */}
            <Text style={styles.metaText}>
              {job.zone.nameEn} · {formatRelativeTime(job.createdAt, 'en')}
            </Text>

            <Divider />

            {/* Description */}
            <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.description')}</Text>
            <Text style={styles.bodyText}>{job.description || '—'}</Text>

            <Divider />

            {/* Location */}
            <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.location')}</Text>
            <Text style={styles.bodyText}>{job.address}</Text>
            <Text style={styles.captionText}>{job.zone.nameEn}</Text>

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

                {/* Bids header */}
                <View style={styles.bidsHeader}>
                  <Text style={styles.sectionLabel}>{t('homeowner.jobDetail.bidsReceived')}</Text>
                  <View style={styles.countChip}>
                    <Text style={styles.countText}>
                      {bids.length} {t('homeowner.jobDetail.bids')}
                    </Text>
                  </View>
                </View>

                {/* Sort row */}
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

                {bidsLoading ? (
                  <View style={styles.bidsLoading}>
                    <ActivityIndicator color={Colors.primary600} />
                  </View>
                ) : sortedBids.length === 0 ? (
                  <View style={styles.bidsLoading}>
                    <Text style={styles.captionText}>{t('homeowner.jobDetail.noBids')}</Text>
                  </View>
                ) : (
                  <View style={styles.bidsList}>
                    {sortedBids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        onAccept={() => handleOpenAcceptSheet(bid)}
                        t={t}
                      />
                    ))}
                  </View>
                )}

                {/* Cancel job button */}
                <Button
                  label={t('homeowner.jobDetail.cancelJob')}
                  variant="destructive"
                  onPress={() => cancelSheetRef.current?.present()}
                  style={styles.cancelBtn}
                />
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

  // ── Image ───────────────────────────────────────────────────────────────────
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

  // ── Content card ────────────────────────────────────────────────────────────
  contentCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -16,
    padding: Spacing.s4,
    gap: Spacing.s3,
    flex: 1,
  },
  jobTitle: {
    ...Typography.heading1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    backgroundColor: Colors.gray100,
    paddingVertical: 6,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
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
    marginBottom: Spacing.s1,
  },
  bodyText: {
    ...Typography.body,
    lineHeight: 22,
  },
  captionText: {
    ...Typography.caption,
  },

  // ── Expert block ────────────────────────────────────────────────────────────
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

  // ── Bids section ────────────────────────────────────────────────────────────
  bidsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countChip: {
    backgroundColor: Colors.primary100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  sortBtn: {
    paddingVertical: 6,
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
  bidsList: {
    gap: Spacing.s3,
  },

  // ── Bid card ────────────────────────────────────────────────────────────────
  bidCard: {
    gap: Spacing.s2,
  },
  bidExpertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s3,
  },
  bidExpertInfo: {
    flex: 1,
  },
  bidNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  bidExpertName: {
    ...Typography.bodyMd,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success600,
  },
  bidExpertMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
  bidRating: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
  },
  bidPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  bidPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
  },
  bidArrival: {
    ...Typography.caption,
  },
  bidChipRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  bidMessage: {
    ...Typography.body,
  },

  // ── Cancel button ───────────────────────────────────────────────────────────
  cancelBtn: {
    marginTop: Spacing.s3,
  },

  // ── Bottom sheet ────────────────────────────────────────────────────────────
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
});
