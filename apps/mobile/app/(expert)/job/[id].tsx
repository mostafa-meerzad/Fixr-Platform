import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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

// ─── Options ───────────────────────────────────────────────────────────────────

const ARRIVAL_OPTIONS = [
  { label: '~30 min', value: 30 },
  { label: '~1 h', value: 60 },
  { label: '~2 h', value: 120 },
  { label: '~3 h', value: 180 },
  { label: 'Tomorrow AM', value: 720 },
];

const DURATION_OPTIONS = [
  { label: '30 min', value: 0.5 },
  { label: '1 h', value: 1 },
  { label: '2 h', value: 2 },
  { label: 'Half day', value: 4 },
  { label: 'Full day', value: 8 },
];

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

// ─── Picker ────────────────────────────────────────────────────────────────────

function PickerField({
  label,
  selectedLabel,
  onSelect,
  options,
  placeholder,
  error,
}: {
  label: string;
  selectedLabel: string;
  onSelect: (label: string, value: number) => void;
  options: { label: string; value: number }[];
  placeholder: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={pickerStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[pickerStyles.trigger, error ? pickerStyles.triggerError : undefined]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text
          style={selectedLabel ? pickerStyles.triggerValue : pickerStyles.triggerPlaceholder}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <MaterialCommunityIcons name={Icons.chevronDown as any} size={18} color={Colors.gray400} />
      </TouchableOpacity>
      {error ? <Text style={pickerStyles.errorText}>{error}</Text> : null}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={pickerStyles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={pickerStyles.sheet}
            onStartShouldSetResponder={() => true}
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  pickerStyles.option,
                  selectedLabel === opt.label ? pickerStyles.optionSelected : undefined,
                ]}
                onPress={() => {
                  onSelect(opt.label, opt.value);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    pickerStyles.optionText,
                    selectedLabel === opt.label ? pickerStyles.optionTextSelected : undefined,
                  ]}
                >
                  {opt.label}
                </Text>
                {selectedLabel === opt.label && (
                  <MaterialCommunityIcons name="check" size={16} color={Colors.primary600} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gray600,
    marginBottom: 6,
  },
  trigger: {
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s4,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  triggerError: {
    borderColor: Colors.danger600,
  },
  triggerValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.gray900,
    marginRight: Spacing.s2,
  },
  triggerPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.gray400,
    marginRight: Spacing.s2,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger600,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s8,
  },
  option: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: Spacing.s6,
    paddingVertical: Spacing.s4,
  },
  optionSelected: {
    backgroundColor: Colors.primary50,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.gray900,
  },
  optionTextSelected: {
    fontWeight: '600' as const,
    color: Colors.primary600,
  },
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ExpertJobDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [myBid, setMyBid] = useState<MyBid | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  // Form state
  const [price, setPrice] = useState('');
  const [arrivalLabel, setArrivalLabel] = useState('');
  const [arrivalValue, setArrivalValue] = useState<number | null>(null);
  const [durationLabel, setDurationLabel] = useState('');
  const [durationValue, setDurationValue] = useState<number | null>(null);
  const [includeWarranty, setIncludeWarranty] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [arrivalError, setArrivalError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const heroImages = (job?.media ?? []).filter((m) => m.type === 'image');

  const prefillForm = (bid: MyBid) => {
    setPrice(String(bid.price));
    const aOpt = ARRIVAL_OPTIONS.find((o) => o.value === bid.estimatedArrivalMinutes);
    setArrivalLabel(aOpt?.label ?? `${bid.estimatedArrivalMinutes} min`);
    setArrivalValue(bid.estimatedArrivalMinutes);
    const dOpt = DURATION_OPTIONS.find((o) => o.value === bid.estimatedDurationHours);
    setDurationLabel(dOpt?.label ?? `${bid.estimatedDurationHours} h`);
    setDurationValue(bid.estimatedDurationHours);
    setIncludeWarranty(!!bid.warrantyDescription);
    setNote(bid.expertMessage ?? '');
  };

  const resetForm = () => {
    setPrice('');
    setArrivalLabel('');
    setArrivalValue(null);
    setDurationLabel('');
    setDurationValue(null);
    setIncludeWarranty(false);
    setNote('');
    setPriceError('');
    setArrivalError('');
    setDurationError('');
  };

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
        const existing = bidList.find((b) => !b.isWithdrawn) ?? null;
        setMyBid(existing);
        if (existing) prefillForm(existing);
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

  const validateAndSubmit = async () => {
    let valid = true;
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setPriceError(t('expert.jobDetail.priceRequired'));
      valid = false;
    } else setPriceError('');
    if (arrivalValue === null) {
      setArrivalError(t('expert.jobDetail.fieldRequired'));
      valid = false;
    } else setArrivalError('');
    if (durationValue === null) {
      setDurationError(t('expert.jobDetail.fieldRequired'));
      valid = false;
    } else setDurationError('');
    if (!valid) return;

    const payload: PlaceBidPayload = {
      price: Number(price),
      estimatedArrivalMinutes: arrivalValue!,
      estimatedDurationHours: durationValue!,
      warrantyDescription: includeWarranty ? t('expert.jobDetail.warrantyDefault') : undefined,
      expertMessage: note.trim() || undefined,
    };

    try {
      setSubmitting(true);
      if (myBid && editMode) {
        await bidsService.update(myBid.id, payload);
        setEditMode(false);
        show({ message: t('expert.jobDetail.bidUpdated'), variant: 'success' });
      } else {
        await bidsService.place(id, payload);
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
      setMyBid(null);
      setEditMode(false);
      resetForm();
      await load();
    } catch {
      show({ message: t('common.error'), variant: 'error' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const canSubmit = price.trim() !== '' && arrivalValue !== null && durationValue !== null;
  const isOpen = job?.status === 'OPEN';
  const showForm = isOpen && (!myBid || editMode);
  const BOTTOM_H = 104 + insets.bottom;

  // ── Loading ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: Colors.bgApp, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialCommunityIcons name={Icons.back as any} size={20} color={Colors.gray900} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────────

  if (error || !job) {
    return (
      <View style={[styles.flex, { backgroundColor: Colors.bgApp, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialCommunityIcons name={Icons.back as any} size={20} color={Colors.gray900} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={load} style={styles.retryBtn} />
        </View>
      </View>
    );
  }

  const displayName = formatDisplayName(job.homeowner?.name);

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <>
      <View style={[styles.flex, { backgroundColor: Colors.bgApp, paddingTop: insets.top }]}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()} activeOpacity={0.8}>
            <MaterialCommunityIcons name={Icons.back as any} size={20} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
          <Pill label={getUrgencyLabel(job.urgency)} variant={getUrgencyVariant(job.urgency)} />
        </View>

        {/* ── Scroll content ─────────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: showForm ? BOTTOM_H + Spacing.s4 : Spacing.s8,
            }}
          >
            {/* ── Photo thumbnails ─────────────────────────────────────────────── */}
            {heroImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbsRow}
              >
                {heroImages.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setFullscreenUri(m.url)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: m.url }} style={styles.thumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.content}>
              {/* ── Description ──────────────────────────────────────────────────── */}
              {job.description ? (
                <Text style={styles.description}>{job.description}</Text>
              ) : null}

              {/* ── Homeowner trust row ───────────────────────────────────────────── */}
              <View style={styles.homeownerRow}>
                <Avatar size={40} name={job.homeowner?.name} uri={job.homeowner?.avatarUrl} />
                <View style={styles.homeownerInfo}>
                  <Text style={styles.homeownerName}>{displayName || t('common.unknown')}</Text>
                  <Text style={styles.homeownerMeta}>
                    {`+${job.homeowner?.positivePoints ?? 0} ${t('expert.jobDetail.positivePoints')} · ${job.homeowner?.jobsPosted ?? 0} ${t('expert.jobDetail.jobsPosted')} · ${job.zone.nameEn}`}
                  </Text>
                </View>
              </View>

              <Divider />

              {/* ── Existing bid (view mode) ──────────────────────────────────────── */}
              {myBid && !editMode && (
                <Card variant="accepted" style={styles.myBidCard}>
                  <View style={styles.myBidTopRow}>
                    <Text style={styles.myBidPrice}>{myBid.price.toLocaleString()} AFN</Text>
                    <Pill label={t('expert.jobDetail.bidPlacedPill')} variant="primary" />
                  </View>
                  <View style={styles.chipsRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>~{myBid.estimatedArrivalMinutes} min</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{myBid.estimatedDurationHours} h</Text>
                    </View>
                    {myBid.warrantyDescription ? (
                      <View style={styles.chip}>
                        <MaterialCommunityIcons name="check-circle-outline" size={11} color={Colors.success600} />
                        <Text style={styles.chipText}>{myBid.warrantyDescription}</Text>
                      </View>
                    ) : null}
                  </View>
                  {myBid.expertMessage ? (
                    <Text style={styles.myBidNote}>{myBid.expertMessage}</Text>
                  ) : null}
                  <View style={styles.myBidActions}>
                    <Button
                      label={t('expert.jobDetail.editBid')}
                      variant="secondary"
                      onPress={() => setEditMode(true)}
                      style={styles.halfBtn}
                    />
                    <Button
                      label={t('expert.jobDetail.withdrawBid')}
                      variant="ghost"
                      onPress={handleWithdraw}
                      loading={withdrawLoading}
                      style={styles.halfBtn}
                    />
                  </View>
                </Card>
              )}

              {/* ── Bid form ─────────────────────────────────────────────────────── */}
              {showForm && (
                <View style={styles.bidForm}>
                  <Text style={styles.bidFormTitle}>{t('expert.jobDetail.formTitle')}</Text>

                  {/* Price */}
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
                        } else setPriceError('');
                      }}
                    />
                  </View>

                  {/* Arrival + Duration row */}
                  <View style={styles.pickersRow}>
                    <PickerField
                      label={t('expert.jobDetail.arrivalLabel')}
                      selectedLabel={arrivalLabel}
                      onSelect={(lbl, val) => {
                        setArrivalLabel(lbl);
                        setArrivalValue(val);
                        setArrivalError('');
                      }}
                      options={ARRIVAL_OPTIONS}
                      placeholder={t('expert.jobDetail.selectPlaceholder')}
                      error={arrivalError}
                    />
                    <View style={{ width: Spacing.s3 }} />
                    <PickerField
                      label={t('expert.jobDetail.durationLabel')}
                      selectedLabel={durationLabel}
                      onSelect={(lbl, val) => {
                        setDurationLabel(lbl);
                        setDurationValue(val);
                        setDurationError('');
                      }}
                      options={DURATION_OPTIONS}
                      placeholder={t('expert.jobDetail.selectPlaceholder')}
                      error={durationError}
                    />
                  </View>

                  {/* Note */}
                  <View style={styles.formField}>
                    <Input
                      label={t('expert.jobDetail.messageLabel')}
                      placeholder={t('expert.jobDetail.messagePlaceholder')}
                      value={note}
                      onChangeText={setNote}
                      multiline
                    />
                  </View>

                  {/* Warranty checkbox */}
                  <TouchableOpacity
                    style={styles.warrantyRow}
                    onPress={() => setIncludeWarranty((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, includeWarranty ? styles.checkboxChecked : undefined]}>
                      {includeWarranty && (
                        <MaterialCommunityIcons name="check" size={13} color={Colors.white} />
                      )}
                    </View>
                    <Text style={styles.warrantyLabel}>{t('expert.jobDetail.warrantyCheck')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Sticky bottom CTA ───────────────────────────────────────────────── */}
        {showForm && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.s3 }]}>
            <Button
              label={
                myBid && editMode
                  ? t('expert.jobDetail.updateBid')
                  : t('expert.jobDetail.placeBidCta')
              }
              onPress={validateAndSubmit}
              loading={submitting}
              disabled={!canSubmit || submitting}
            />
            <Text style={styles.creditFootnote}>
              {t('expert.jobDetail.creditFootnote', { balance: creditBalance })}
            </Text>
          </View>
        )}
      </View>

      {/* ── Fullscreen image viewer ─────────────────────────────────────────────── */}
      <Modal
        visible={fullscreenUri !== null}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
      >
        <SafeAreaView style={styles.fullscreenBg} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setFullscreenUri(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name={Icons.back as any} size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {fullscreenUri && (
            <Image
              source={{ uri: fullscreenUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </SafeAreaView>
      </Modal>
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.gray900,
  },

  // ── Photo thumbnails ─────────────────────────────────────────────────────────
  thumbsRow: {
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    gap: Spacing.s2,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },

  // ── Content ──────────────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  description: {
    ...Typography.body,
    lineHeight: 22,
  },

  // ── Homeowner row ─────────────────────────────────────────────────────────────
  homeownerRow: {
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
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.gray900,
  },
  homeownerMeta: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.gray600,
    lineHeight: 17,
  },

  // ── Existing bid card ─────────────────────────────────────────────────────────
  myBidCard: {
    gap: Spacing.s2,
  },
  myBidTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myBidPrice: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.gray900,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gray100,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.gray600,
  },
  myBidNote: {
    ...Typography.body,
    color: Colors.gray600,
  },
  myBidActions: {
    flexDirection: 'row',
    gap: Spacing.s2,
    marginTop: Spacing.s2,
  },
  halfBtn: {
    flex: 1,
  },

  // ── Bid form ──────────────────────────────────────────────────────────────────
  bidForm: {
    gap: Spacing.s4,
  },
  bidFormTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.gray900,
  },
  formField: {},
  pickersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    paddingVertical: Spacing.s2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary600,
    borderColor: Colors.primary600,
  },
  warrantyLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.gray900,
  },

  // ── Bottom CTA bar ────────────────────────────────────────────────────────────
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
    gap: Spacing.s2,
  },
  creditFootnote: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.gray400,
    textAlign: 'center',
  },

  // ── Fullscreen viewer ─────────────────────────────────────────────────────────
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
});
