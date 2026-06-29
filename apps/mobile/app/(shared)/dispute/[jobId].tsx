import React, { useState } from 'react';
import {
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
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { disputesService } from '@/services/disputes.service';

// ─── Reason options ────────────────────────────────────────────────────────────

const DISPUTE_REASONS = [
  { value: 'NO_SHOW',              labelKey: 'shared.dispute.reasonNoShow'      },
  { value: 'PRICE_DISPUTE',        labelKey: 'shared.dispute.reasonPriceDispute'},
  { value: 'WORK_QUALITY',         labelKey: 'shared.dispute.reasonWorkQuality' },
  { value: 'COMMUNICATION_ISSUE',  labelKey: 'shared.dispute.reasonCommunication'},
  { value: 'OTHER',                labelKey: 'shared.dispute.reasonOther'       },
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number]['value'];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function DisputeScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { show } = useToast();

  const [selectedReason, setSelectedReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = selectedReason !== null && description.trim().length >= 20;

  function handleDescriptionBlur() {
    if (description.trim().length > 0 && description.trim().length < 20) {
      setDescriptionError(t('shared.dispute.descriptionError'));
    } else {
      setDescriptionError('');
    }
  }

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
        {/* Page heading */}
        <Text style={styles.heading}>{t('shared.dispute.heading')}</Text>
        <Text style={styles.subtitle}>{t('shared.dispute.subtitle')}</Text>

        {/* Reason selector */}
        <Text style={styles.sectionLabel}>{t('shared.dispute.whatWentWrong')}</Text>
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
                <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                  {t(reason.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>{t('shared.dispute.describeWhat')}</Text>
        <Input
          label=""
          placeholder={t('shared.dispute.descriptionPlaceholder')}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (descriptionError) setDescriptionError('');
          }}
          onBlur={handleDescriptionBlur}
          error={descriptionError}
          multiline
        />

        {/* Submit button */}
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

  // ── Heading ─────────────────────────────────────────────────────────────────
  heading: {
    ...Typography.heading1,
    marginBottom: -Spacing.s2,
  },
  subtitle: {
    ...Typography.body,
  },

  // ── Section labels ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -Spacing.s2,
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
    borderRadius: Radius.sm,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
  },
  reasonRowSelected: {
    borderWidth: 2,
    borderColor: Colors.danger600,
    backgroundColor: Colors.danger100,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.danger600,
    backgroundColor: Colors.danger600,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray900,
  },
  reasonLabelSelected: {
    color: Colors.danger600,
  },

  // ── Submit button ────────────────────────────────────────────────────────────
  submitBtnActive: {
    backgroundColor: Colors.danger600,
  },
});
