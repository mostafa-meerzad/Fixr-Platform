import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 270;
const BID_SHEET_SNAP = ['85%'];

// ─── Types ─────────────────────────────────────────────────────────────────────

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

function formatDisplayName(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[1][0]}.`;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ExpertJobDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  const bidSheetRef = useRef<BottomSheetModal>(null);
  const carouselRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [myBid, setMyBid] = useState<MyBid | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  // Bid form
  const [price, setPrice] = useState('');
  const [arrivalMinutes, setArrivalMinutes] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [warranty, setWarranty] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [arrivalError, setArrivalError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [editBidId, setEditBidId] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const heroImages = job?.media.filter((m) => m.type === 'image') ?? [];
  const allMedia = job?.media ?? [];
  const imageCount = heroImages.length;

  // Auto-advance carousel
  useEffect(() => {
    if (imageCount <= 1) return;
    const timer = setInterval(() => {
      setImageIndex((prev) => {
        const next = (prev + 1) % imageCount;
        carouselRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [imageCount]);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const [jobRes, profileRes] = await Promise.all([
        jobsService.get(id),
        usersService.getMe(),
      ]);
      setJob(jobRes.data as JobDetail);
      const balance = profileRes.data?.expertProfile?.creditBalance?.balance ?? 0;
      setCreditBalance(balance);

      try {
        const bidsRes = await bidsService.listForJob(id);
        const bidList = bidsRes.data as MyBid[];
        setMyBid(bidList.find((b) => !b.isWithdrawn) ?? null);
      } catch {
        // no bid yet
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(' ') : (raw ?? '');
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

  const canSubmit = price.trim() !== '' && arrivalMinutes.trim() !== '' && durationHours.trim() !== '';
  const BOTTOM_BAR_H = 80 + insets.bottom;

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: Colors.bgApp }]}>
        <TouchableOpacity
          style={[styles.backCircle, { position: 'absolute', top: insets.top + 8, left: Spacing.s4, zIndex: 10 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name={Icons.back as any} size={20} color={Colors.gray900} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (error || !job) {
    return (
      <View style={[styles.flex, { backgroundColor: Colors.bgApp }]}>
        <TouchableOpacity
          style={[styles.backCircle, { position: 'absolute', top: insets.top + 8, left: Spacing.s4, zIndex: 10 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name={Icons.back as any} size={20} color={Colors.gray900} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={load} style={styles.retryBtn} />
        </View>
      </View>
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isOpen = job.status === 'OPEN';
  const displayName = formatDisplayName(job.homeowner?.name);
  const timeAgo = formatRelativeTime(job.openedAt ?? job.createdAt, 'en');
  const bidCount = job._count.bids;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <View style={[styles.flex, { backgroundColor: Colors.bgApp }]}>
        {/* ── Scrollable content ─────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isOpen && !myBid ? BOTTOM_BAR_H + Spacing.s4 : Spacing.s8 }}
        >
          {/* ── Hero image carousel ──────────────────────────────────────────── */}
          <View style={styles.hero}>
            {heroImages.length > 0 ? (
              <>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled
                  scrollEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                    setImageIndex(idx);
                  }}
                  style={StyleSheet.absoluteFill}
                >
                  {heroImages.map((m) => (
                    <Image key={m.id} source={{ uri: m.url }} style={styles.heroImage} resizeMode="cover" />
                  ))}
                </ScrollView>
                {/* Dark gradient overlay for readability */}
                <View style={styles.heroOverlay} />
                {/* Dots */}
                {heroImages.length > 1 && (
                  <View style={styles.dotsRow}>
                    {heroImages.map((_, i) => (
                      <View key={i} style={[styles.dot, i === imageIndex ? styles.dotActive : styles.dotInactive]} />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.heroPlaceholder}>
                <MaterialIcons
                  name={(job.category ? Icons.assignment : Icons.image) as any}
                  size={56}
                  color={Colors.primary600}
                />
              </View>
            )}
          </View>

          {/* ── White content card ────────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Title + urgency badge */}
            <View style={styles.titleRow}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Pill label={getUrgencyLabel(job.urgency)} variant={getUrgencyVariant(job.urgency)} />
            </View>

            {/* Category · time · bids */}
            <View style={styles.metaRow}>
              {job.category && (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{job.category.nameEn}</Text>
                </View>
              )}
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>{timeAgo}</Text>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>{bidCount} {t('expert.jobDetail.bids')}</Text>
            </View>

            <Divider />

            {/* Description */}
            <Text style={styles.sectionLabel}>{t('expert.jobDetail.description')}</Text>
            <Text style={styles.bodyText}>{job.description || '—'}</Text>

            {/* Media thumbnails */}
            {allMedia.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbsRow}
              >
                {allMedia.map((m) =>
                  m.type === 'image' ? (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setFullscreenUri(m.url)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: m.url }} style={styles.thumb} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => Linking.openURL(m.url)}
                      activeOpacity={0.85}
                      style={styles.videoThumb}
                    >
                      <MaterialIcons name={Icons.play as any} size={32} color={Colors.white} />
                      <Text style={styles.videoLabel}>{t('expert.jobDetail.video')}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            )}

            <Divider />

            {/* Homeowner */}
            <Text style={styles.sectionLabel}>{t('expert.jobDetail.homeowner')}</Text>
            <View style={styles.homeownerCard}>
              <Avatar size={40} name={job.homeowner?.name} uri={job.homeowner?.avatarUrl} />
              <View style={styles.homeownerInfo}>
                <Text style={styles.homeownerName}>{displayName || t('common.unknown')}</Text>
                <View style={styles.homeownerStats}>
                  <MaterialIcons name={Icons.thumbUp as any} size={12} color={Colors.success600} />
                  <Text style={styles.homeownerStatText}>
                    {job.homeowner?.positivePoints ?? 0} {t('expert.jobDetail.positivePoints')}
                    {job.homeowner?.jobsPosted !== undefined
                      ? ` · ${job.homeowner.jobsPosted} ${t('expert.jobDetail.jobsPosted')}`
                      : null}
                  </Text>
                </View>
              </View>
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <MaterialIcons name={Icons.location as any} size={IconSize.status} color={Colors.gray400} />
              <Text style={styles.locationText}>{job.address}, {job.zone.nameEn}</Text>
            </View>

            {/* My bid (if placed) */}
            {myBid && (
              <>
                <Divider />
                <Text style={styles.sectionLabel}>{t('expert.jobDetail.yourBid')}</Text>
                <Card variant="accepted" style={styles.myBidCard}>
                  <View style={styles.myBidRow}>
                    <Text style={styles.myBidPrice}>{myBid.price.toLocaleString()} AFN</Text>
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

        {/* ── Overlaid navigation (back + zone) ─────────────────────────────── */}
        <View style={[styles.navOverlay, { top: insets.top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()} activeOpacity={0.8}>
            <MaterialIcons name={Icons.back as any} size={20} color={Colors.gray900} />
          </TouchableOpacity>
          <View style={styles.zoneChip}>
            <MaterialIcons name={Icons.location as any} size={12} color={Colors.white} />
            <Text style={styles.zoneChipText} numberOfLines={1}>{job.zone.nameEn}</Text>
          </View>
        </View>

        {/* ── Sticky bottom bar (OPEN + no bid placed) ──────────────────────── */}
        {isOpen && !myBid && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.s3 }]}>
            <View style={styles.creditsBlock}>
              <Text style={styles.creditsNumber}>{creditBalance}</Text>
              <Text style={styles.creditsLabel}>{t('expert.jobDetail.creditsRemaining')}</Text>
            </View>
            <TouchableOpacity
              style={styles.placeBidBtn}
              onPress={() => openBidSheet()}
              activeOpacity={0.85}
            >
              <Text style={styles.placeBidText}>{t('expert.jobDetail.placeBid')}</Text>
              <View style={styles.placeBidDivider} />
              <View style={styles.placeBidCredit}>
                <MaterialIcons name={Icons.credit as any} size={14} color={Colors.white} />
                <Text style={styles.placeBidText}>1 {t('expert.jobDetail.credit')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Fullscreen image viewer ─────────────────────────────────────────── */}
      <Modal visible={fullscreenUri !== null} transparent={false} animationType="fade" statusBarTranslucent>
        <SafeAreaView style={styles.fullscreenBg} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setFullscreenUri(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name={Icons.back as any} size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {fullscreenUri && (
            <Image source={{ uri: fullscreenUri }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Bid form bottom sheet ───────────────────────────────────────────── */}
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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.sheetTitle}>{t('expert.jobDetail.formTitle')}</Text>

            <View style={styles.formField}>
              <Input
                label={t('expert.jobDetail.priceLabel')}
                placeholder={t('expert.jobDetail.pricePlaceholder')}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                ltrText
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
                  ltrText
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
                  ltrText
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
  flex: {
    flex: 1,
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

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    height: HERO_H,
    backgroundColor: Colors.primary50,
    overflow: 'hidden',
  },
  heroImage: {
    width: SCREEN_W,
    height: HERO_H,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: Spacing.s5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.s1,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // ── Nav overlay ─────────────────────────────────────────────────────────────
  navOverlay: {
    position: 'absolute',
    left: Spacing.s4,
    right: Spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    borderRadius: Radius.full,
    maxWidth: 160,
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },

  // ── White card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -Radius.xl,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s5,
    paddingBottom: Spacing.s4,
    gap: Spacing.s3,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.s3,
  },
  jobTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: Colors.gray100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
  metaSep: {
    fontSize: 12,
    color: Colors.gray400,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray400,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bodyText: {
    ...Typography.body,
    lineHeight: 22,
  },

  // ── Media thumbnails ─────────────────────────────────────────────────────────
  thumbsRow: {
    gap: Spacing.s2,
    paddingVertical: Spacing.s1,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },
  videoThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray900,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  videoLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.white,
  },

  // ── Homeowner card ───────────────────────────────────────────────────────────
  homeownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    padding: Spacing.s3,
  },
  homeownerInfo: {
    flex: 1,
    gap: 3,
  },
  homeownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
  },
  homeownerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  homeownerStatText: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray600,
  },

  // ── Location ────────────────────────────────────────────────────────────────
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray400,
    lineHeight: 18,
  },

  // ── My bid card ──────────────────────────────────────────────────────────────
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

  // ── Bottom bar ───────────────────────────────────────────────────────────────
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
  creditsBlock: {
    flex: 1,
    gap: 1,
  },
  creditsNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary600,
  },
  creditsLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray400,
  },
  placeBidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary600,
    borderRadius: Radius.sm,
    height: 52,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s2,
  },
  placeBidText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  placeBidDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  placeBidCredit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // ── Fullscreen viewer ────────────────────────────────────────────────────────
  fullscreenBg: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s4,
  },
  fullscreenClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    flex: 1,
    width: SCREEN_W,
  },

  // ── Bid sheet ────────────────────────────────────────────────────────────────
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
