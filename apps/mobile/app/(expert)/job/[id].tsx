import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { bidsService, type PlaceBidPayload } from '@/services/bids.service';
import { jobsService, type JobStatus, type JobUrgency } from '@/services/jobs.service';
import { usersService } from '@/services/users.service';
import { formatRelativeTime } from '@/utils/format';

const SCREEN_W = Dimensions.get('window').width;
const BID_SHEET_SNAP = ['85%'];

// ─── Local types ───────────────────────────────────────────────────────────────

interface JobMedia {
  id: string;
  url: string;
  type: string;
}

interface MyBid {
  id: string;
  price: number;
  estimatedArrivalMinutes: number;
  estimatedDurationHours: number;
  warrantyDescription?: string;
  expertMessage?: string;
  isWithdrawn: boolean;
  status?: string;
  expert: {
    id: string;
    verificationStatus: string;
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
    avatarUrl?: string | null;
    positivePoints?: number;
    jobsPosted?: number;
  };
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

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ExpertJobDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const bidSheetRef = useRef<BottomSheetModal>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [myBid, setMyBid] = useState<MyBid | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  // Bid form state
  const [price, setPrice] = useState('');
  const [arrivalMinutes, setArrivalMinutes] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [warranty, setWarranty] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [arrivalError, setArrivalError] = useState('');
  const [durationError, setDurationError] = useState('');

  // Edit mode
  const [editBidId, setEditBidId] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const [jobRes, profileRes] = await Promise.all([
        jobsService.get(id),
        usersService.getMe(),
      ]);
      const jobData = jobRes.data as JobDetail;
      setJob(jobData);

      const profile = profileRes.data;
      const balance = profile.expertProfile?.creditBalance?.balance ?? 0;
      setCreditBalance(balance);

      // Check for own bid
      try {
        const bidsRes = await bidsService.listForJob(id);
        const bidList = bidsRes.data as MyBid[];
        const activeBid = bidList.find((b) => !b.isWithdrawn) ?? null;
        setMyBid(activeBid);
      } catch {
        // no bid yet is fine
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    [],
  );

  const openBidSheet = (editBid?: MyBid) => {
    if (editBid) {
      setEditBidId(editBid.id);
      setPrice(String(editBid.price));
      setArrivalMinutes(String(editBid.estimatedArrivalMinutes));
      setDurationHours(String(editBid.estimatedDurationHours));
      setWarranty(editBid.warrantyDescription ?? '');
      setMessage(editBid.expertMessage ?? '');
    } else {
      setEditBidId(null);
      setPrice('');
      setArrivalMinutes('');
      setDurationHours('');
      setWarranty('');
      setMessage('');
    }
    setPriceError('');
    setArrivalError('');
    setDurationError('');
    bidSheetRef.current?.present();
  };

  const validateAndSubmit = async () => {
    let valid = true;
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setPriceError(t('expert.jobDetail.priceRequired'));
      valid = false;
    } else {
      setPriceError('');
    }
    if (!arrivalMinutes.trim() || isNaN(Number(arrivalMinutes)) || Number(arrivalMinutes) <= 0) {
      setArrivalError(t('expert.jobDetail.fieldRequired'));
      valid = false;
    } else {
      setArrivalError('');
    }
    if (!durationHours.trim() || isNaN(Number(durationHours)) || Number(durationHours) <= 0) {
      setDurationError(t('expert.jobDetail.fieldRequired'));
      valid = false;
    } else {
      setDurationError('');
    }
    if (!valid) return;

    const payload: PlaceBidPayload = {
      price: Number(price),
      estimatedArrivalMinutes: Number(arrivalMinutes),
      estimatedDurationHours: Number(durationHours),
      warrantyDescription: warranty.trim() || undefined,
      expertMessage: message.trim() || undefined,
    };

    try {
      setSubmitting(true);
      if (editBidId) {
        await bidsService.update(editBidId, payload);
        bidSheetRef.current?.dismiss();
        show({ message: t('expert.jobDetail.bidUpdated'), variant: 'success' });
      } else {
        await bidsService.place(id, payload);
        bidSheetRef.current?.dismiss();
        show({ message: t('expert.jobDetail.bidPlaced'), variant: 'success' });
      }
      await load();
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('insufficient')) {
        show({ message: t('expert.jobDetail.insufficientCredits'), variant: 'error' });
      } else if (msg.toLowerCase().includes('already')) {
        show({ message: t('expert.jobDetail.alreadyBid'), variant: 'error' });
      } else {
        show({ message: t('common.error'), variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myBid) return;
    try {
      setWithdrawLoading(true);
      await bidsService.withdraw(myBid.id);
      show({ message: t('expert.jobDetail.withdrawSuccess'), variant: 'success' });
      await load();
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const canSubmit =
    price.trim() !== '' &&
    arrivalMinutes.trim() !== '' &&
    durationHours.trim() !== '';

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('expert.jobDetail.title')}</Text>
          <View style={styles.headerSpacer} />
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
          <Text style={styles.headerTitle}>{t('expert.jobDetail.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={load} style={styles.retryBtn} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const images = job.media.filter((m) => m.type === 'image');
  const isOpen = job.status === 'OPEN';
  const homeownerFirstName = job.homeowner?.name?.split(' ')[0] ?? t('common.unknown');
  const BOTTOM_BAR_H = 72 + insets.bottom;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('expert.jobDetail.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: isOpen ? BOTTOM_BAR_H + Spacing.s4 : Spacing.s8 }]}
        >
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

            {/* Category + urgency */}
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
            <Text style={styles.sectionLabel}>{t('expert.jobDetail.description')}</Text>
            <Text style={styles.bodyText}>{job.description || '—'}</Text>

            <Divider />

            {/* Homeowner trust block */}
            <Text style={styles.sectionLabel}>{t('expert.jobDetail.homeowner')}</Text>
            <View style={styles.trustRow}>
              <Avatar size={40} name={job.homeowner?.name} uri={job.homeowner?.avatarUrl} />
              <View style={styles.trustInfo}>
                <Text style={styles.bodyMd}>
                  {t('expert.jobDetail.postedBy')} {homeownerFirstName}
                </Text>
                {job.homeowner?.positivePoints !== undefined && (
                  <Text style={styles.captionText}>
                    ★ {job.homeowner.positivePoints} {t('expert.jobDetail.positiveReviews')}
                    {job.homeowner.jobsPosted !== undefined
                      ? ` · ${job.homeowner.jobsPosted} ${t('expert.jobDetail.jobsPosted')}`
                      : null}
                  </Text>
                )}
              </View>
            </View>

            <Divider />

            {/* Location */}
            <Text style={styles.sectionLabel}>{t('expert.jobDetail.location')}</Text>
            <Text style={styles.bodyText}>{job.address}</Text>
            <Text style={styles.captionText}>{job.zone.nameEn}</Text>

            {/* ── My bid card (if bid placed) ── */}
            {myBid && (
              <>
                <Divider />
                <Text style={styles.sectionLabel}>{t('expert.jobDetail.yourBid')}</Text>
                <Card variant="accepted" style={styles.myBidCard}>
                  <View style={styles.myBidRow}>
                    <Text style={styles.myBidPrice}>
                      {myBid.price.toLocaleString()} AFN
                    </Text>
                    <Pill label={t('expert.jobDetail.bidPlacedPill')} variant="primary" />
                  </View>
                  <View style={styles.myBidChips}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>~{myBid.estimatedArrivalMinutes}min {t('expert.jobDetail.arrival')}</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{myBid.estimatedDurationHours}hrs</Text>
                    </View>
                    {myBid.warrantyDescription ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{myBid.warrantyDescription}</Text>
                      </View>
                    ) : null}
                  </View>
                  {myBid.expertMessage ? (
                    <Text style={styles.myBidMessage}>{myBid.expertMessage}</Text>
                  ) : null}
                  <View style={styles.myBidActions}>
                    <Button
                      label={t('expert.jobDetail.editBid')}
                      variant="secondary"
                      onPress={() => openBidSheet(myBid)}
                      style={styles.myBidActionBtn}
                    />
                    <Button
                      label={t('expert.jobDetail.withdrawBid')}
                      variant="ghost"
                      onPress={handleWithdraw}
                      loading={withdrawLoading}
                      style={styles.myBidActionBtn}
                    />
                  </View>
                </Card>
              </>
            )}
          </View>
        </ScrollView>

        {/* ── Sticky bottom bar (OPEN + no bid) ── */}
        {isOpen && !myBid && (
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: insets.bottom + Spacing.s3 },
            ]}
          >
            <Text style={styles.creditsLabel}>
              <Text style={styles.creditsNumber}>{creditBalance}</Text>
              {' '}{t('expert.jobDetail.creditsRemaining')}
            </Text>
            <Button
              label={t('expert.jobDetail.placeBid')}
              onPress={() => openBidSheet()}
              style={styles.placeBidBtn}
            />
          </View>
        )}
      </SafeAreaView>

      {/* ── Bid form bottom sheet ── */}
      <BottomSheetModal
        ref={bidSheetRef}
        snapPoints={BID_SHEET_SNAP}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetScroll}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Text style={styles.sheetTitle}>{t('expert.jobDetail.formTitle')}</Text>

            <View style={styles.formField}>
              <Input
                label={t('expert.jobDetail.priceLabel')}
                placeholder={t('expert.jobDetail.pricePlaceholder')}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                error={priceError}
                onBlur={() => {
                  if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
                    setPriceError(t('expert.jobDetail.priceRequired'));
                  } else {
                    setPriceError('');
                  }
                }}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Input
                  label={t('expert.jobDetail.arrivalLabel')}
                  placeholder={t('expert.jobDetail.arrivalPlaceholder')}
                  value={arrivalMinutes}
                  onChangeText={setArrivalMinutes}
                  keyboardType="numeric"
                  error={arrivalError}
                  onBlur={() => {
                    if (!arrivalMinutes.trim() || isNaN(Number(arrivalMinutes)) || Number(arrivalMinutes) <= 0) {
                      setArrivalError(t('expert.jobDetail.fieldRequired'));
                    } else {
                      setArrivalError('');
                    }
                  }}
                />
              </View>
              <View style={styles.formHalf}>
                <Input
                  label={t('expert.jobDetail.durationLabel')}
                  placeholder={t('expert.jobDetail.durationPlaceholder')}
                  value={durationHours}
                  onChangeText={setDurationHours}
                  keyboardType="numeric"
                  error={durationError}
                  onBlur={() => {
                    if (!durationHours.trim() || isNaN(Number(durationHours)) || Number(durationHours) <= 0) {
                      setDurationError(t('expert.jobDetail.fieldRequired'));
                    } else {
                      setDurationError('');
                    }
                  }}
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Input
                label={t('expert.jobDetail.warrantyLabel')}
                placeholder={t('expert.jobDetail.warrantyPlaceholder')}
                value={warranty}
                onChangeText={setWarranty}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label={t('expert.jobDetail.messageLabel')}
                placeholder={t('expert.jobDetail.messagePlaceholder')}
                value={message}
                onChangeText={setMessage}
                multiline
              />
            </View>

            {/* Credit warning */}
            <View style={styles.creditWarning}>
              <MaterialIcons name={Icons.info as any} size={14} color={Colors.warning600} />
              <Text style={styles.creditWarningText}>
                {t('expert.jobDetail.creditWarning', { balance: creditBalance })}
              </Text>
            </View>

            <Button
              label={editBidId ? t('expert.jobDetail.updateBid') : t('expert.jobDetail.submitBid')}
              onPress={validateAndSubmit}
              loading={submitting}
              disabled={!canSubmit}
              style={styles.submitBtn}
            />
          </KeyboardAvoidingView>
        </BottomSheetScrollView>
      </BottomSheetModal>
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
  bodyMd: {
    ...Typography.bodyMd,
  },
  captionText: {
    ...Typography.caption,
  },

  // ── Homeowner trust block ───────────────────────────────────────────────────
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    padding: Spacing.s3,
  },
  trustInfo: {
    flex: 1,
    gap: 2,
  },

  // ── My bid card ─────────────────────────────────────────────────────────────
  myBidCard: {
    gap: Spacing.s2,
  },
  myBidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myBidPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
  },
  myBidChips: {
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
  myBidMessage: {
    ...Typography.body,
    color: Colors.gray600,
  },
  myBidActions: {
    flexDirection: 'row',
    gap: Spacing.s2,
    marginTop: Spacing.s2,
  },
  myBidActionBtn: {
    flex: 1,
  },

  // ── Sticky bottom bar ───────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  creditsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: Colors.gray400,
  },
  creditsNumber: {
    fontWeight: '600',
    color: Colors.primary600,
  },
  placeBidBtn: {
    width: 180,
  },

  // ── Bid sheet ───────────────────────────────────────────────────────────────
  sheetBg: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  sheetHandle: {
    width: 32,
    height: 4,
    backgroundColor: Colors.gray200,
  },
  sheetScroll: {
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s8,
  },
  sheetTitle: {
    ...Typography.heading1,
    marginBottom: Spacing.s4,
    marginTop: Spacing.s2,
  },
  formField: {
    marginBottom: Spacing.s4,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  formHalf: {
    flex: 1,
  },
  creditWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    backgroundColor: Colors.warning100,
    borderRadius: Radius.sm,
    padding: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  creditWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: Colors.warning600,
    lineHeight: 18,
  },
  submitBtn: {
    marginBottom: Spacing.s4,
  },
});
