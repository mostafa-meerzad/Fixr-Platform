import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { jobsService } from '@/services/jobs.service';
import { disputesService } from '@/services/disputes.service';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisputeJobDetail {
  id: string;
  title: string;
  homeownerId: string;
  homeowner: { id: string; name: string };
  acceptedBid?: {
    expert: { user: { id: string; name: string } };
  } | null;
}

// ─── Reason options ────────────────────────────────────────────────────────────

const DISPUTE_REASONS = [
  {
    value: 'NO_SHOW',
    labelKey: 'shared.dispute.reasonNoShow',
    subtitleKey: 'shared.dispute.reasonNoShowSub',
  },
  {
    value: 'PRICE_DISPUTE',
    labelKey: 'shared.dispute.reasonPriceDispute',
    subtitleKey: 'shared.dispute.reasonPriceDisputeSub',
  },
  {
    value: 'WORK_QUALITY',
    labelKey: 'shared.dispute.reasonWorkQuality',
    subtitleKey: 'shared.dispute.reasonWorkQualitySub',
  },
  {
    value: 'COMMUNICATION_ISSUE',
    labelKey: 'shared.dispute.reasonCommunication',
    subtitleKey: 'shared.dispute.reasonCommunicationSub',
  },
  {
    value: 'OTHER',
    labelKey: 'shared.dispute.reasonOther',
    subtitleKey: undefined,
  },
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number]['value'];

const DESC_MIN = 20;

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function DisputeScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const user = useAuthStore((s) => s.user);
  const { show } = useToast();

  const [job, setJob] = useState<DisputeJobDetail | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [selectedReason, setSelectedReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    jobsService
      .get(jobId)
      .then((res) => setJob(res.data as DisputeJobDetail))
      .catch(() => {})
      .finally(() => setLoadingJob(false));
  }, [jobId]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const isHomeowner = job ? user?.id === job.homeownerId : user?.role === 'HOMEOWNER';
  const otherPartyName = isHomeowner
    ? (job?.acceptedBid?.expert?.user?.name ?? null)
    : (job?.homeowner?.name ?? null);

  const descCount = description.length;
  const isValid = selectedReason !== null && description.trim().length >= DESC_MIN;

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!isValid || !selectedReason) return;
    try {
      setSubmitting(true);
      await disputesService.submit(jobId, {
        reason: selectedReason,
        description: description.trim(),
      });
      show({ message: t('shared.dispute.successToast'), variant: 'success' });
      router.back();
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('already')) {
        show({ message: t('shared.dispute.errorAlreadyExists'), variant: 'error' });
      } else {
        show({ message: t('shared.dispute.errorNetwork'), variant: 'error' });
      }
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle}>{t('shared.dispute.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Context line — shows once job loads */}
        {!loadingJob && job && (
          <Text style={styles.contextLine}>
            {t('shared.dispute.contextAbout')}{' '}
            <Text style={styles.contextBold}>{job.title}</Text>
            {otherPartyName ? (
              <>
                {' '}{t('shared.dispute.contextWith')}{' '}
                <Text style={styles.contextBold}>{otherPartyName}</Text>
              </>
            ) : null}
            {'. '}{t('shared.dispute.contextPromise')}
          </Text>
        )}

        {/* Reason selector */}
        <View style={styles.reasonList}>
          {DISPUTE_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.value;
            return (
              <TouchableOpacity
                key={reason.value}
                style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                onPress={() => setSelectedReason(reason.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.reasonText}>
                  <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                    {t(reason.labelKey)}
                  </Text>
                  {reason.subtitleKey !== undefined && (
                    <Text style={[styles.reasonSub, isSelected && styles.reasonSubSelected]}>
                      {t(reason.subtitleKey)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <View style={styles.textareaCard}>
          <TextInput
            style={styles.textareaInput}
            placeholder={t('shared.dispute.descriptionPlaceholder')}
            placeholderTextColor={Colors.gray400}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {descCount} / {DESC_MIN} {t('shared.dispute.charMin')}
          </Text>
        </View>

        {/* Submit */}
        <Button
          label={t('shared.dispute.submit')}
          onPress={handleSubmit}
          disabled={!isValid}
          loading={submitting}
          style={isValid ? styles.submitBtnActive : undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
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
    paddingBottom: Spacing.s8,
    gap: Spacing.s4,
  },

  // ── Context line ─────────────────────────────────────────────────────────────
  contextLine: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.gray600,
    lineHeight: 20,
  },
  contextBold: {
    fontWeight: '700',
    color: Colors.gray900,
  },

  // ── Reason list ─────────────────────────────────────────────────────────────
  reasonList: {
    gap: Spacing.s2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
  },
  reasonRowSelected: {
    borderWidth: 2,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary50,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: {
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary600,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  reasonText: {
    flex: 1,
    gap: 2,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray900,
  },
  reasonLabelSelected: {
    color: Colors.primary600,
  },
  reasonSub: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.gray400,
  },
  reasonSubSelected: {
    color: Colors.primary600,
  },

  // ── Textarea card ─────────────────────────────────────────────────────────────
  textareaCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadows.sm,
    padding: Spacing.s4,
    gap: Spacing.s2,
  },
  textareaInput: {
    fontSize: 15,
    color: Colors.gray900,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray400,
    textAlign: 'right',
  },

  // ── Submit button ─────────────────────────────────────────────────────────────
  submitBtnActive: {
    backgroundColor: Colors.danger600,
  },
});
