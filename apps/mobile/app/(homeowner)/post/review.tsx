import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { jobsService } from '@/services/jobs.service';
import { useAuthStore } from '@/stores/auth.store';
import { Colors, Radius, Spacing, Typography, Shadows } from '@/constants/theme';
import { Icons } from '@/constants/icons';

interface JobMedia {
  id: string;
  url: string;
  type: string;
}

interface JobDraft {
  id: string;
  title: string;
  description?: string;
  urgency: 'EMERGENCY' | 'TODAY' | 'SCHEDULED';
  scheduledAt?: string;
  address: string;
  status: string;
  zone: { id: string; nameEn: string };
  category: { id: string; nameEn: string };
  media: JobMedia[];
}

function urgencyLabel(urgency: string, t: (k: string) => string): string {
  if (urgency === 'EMERGENCY') return t('homeowner.post.urgencyEmergency');
  if (urgency === 'TODAY') return t('homeowner.post.urgencyToday');
  return t('homeowner.post.urgencyScheduled');
}

function urgencyVariant(urgency: string): 'danger' | 'warning' | 'gray' {
  if (urgency === 'EMERGENCY') return 'danger';
  if (urgency === 'TODAY') return 'warning';
  return 'gray';
}

// ─── ReviewRow ────────────────────────────────────────────────────────────────

interface ReviewRowProps {
  label: string;
  children: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}

function ReviewRow({ label, children, onEdit, editLabel }: ReviewRowProps) {
  const { t } = useTranslation();
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.valueWrap}>{children}</View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={rowStyles.editBtn}>{editLabel ?? t('homeowner.post.edit')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s3,
    gap: Spacing.s2,
  },
  label: {
    width: 76,
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
    flexShrink: 0,
  },
  valueWrap: {
    flex: 1,
  },
  editBtn: {
    fontSize: 13,
    fontWeight: '600' as any,
    color: Colors.primary600,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const user = useAuthStore((s) => s.user);

  const [job, setJob] = useState<JobDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function loadJob() {
    setLoadError(false);
    try {
      const { data } = await jobsService.get(jobId);
      setJob(data as unknown as JobDraft);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePublish() {
    setPublishing(true);
    try {
      await jobsService.publish(jobId);
      router.replace({ pathname: '/(homeowner)/post/success' as any, params: { jobId } });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? t('homeowner.post.publishError');
      toast.show({ message, variant: 'error' });
      setPublishing(false);
    }
  }

  const photoMedia = (job?.media ?? []).filter((m) => m.type !== 'video');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressBar currentStep={3} totalSteps={3} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('homeowner.post.reviewHeader')}</Text>
        <Text style={styles.stepLabel}>
          {t('homeowner.post.stepLabel', { current: 3, total: 3 })}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button
            label={t('common.retry')}
            onPress={() => { setLoading(true); loadJob(); }}
            style={styles.retryBtn}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <View style={styles.summaryCard}>
            {/* Category */}
            <ReviewRow
              label={t('homeowner.post.categoryRowLabel')}
              onEdit={() => router.back()}
            >
              <Text style={styles.valueText}>{job?.category?.nameEn}</Text>
            </ReviewRow>
            <View style={styles.divider} />

            {/* Description */}
            <ReviewRow
              label={t('homeowner.post.reviewDescLabel')}
              onEdit={() => router.back()}
            >
              <Text style={styles.valueText} numberOfLines={3}>
                {job?.description ?? '—'}
              </Text>
            </ReviewRow>
            <View style={styles.divider} />

            {/* Urgency */}
            <ReviewRow
              label={t('homeowner.post.urgencyRowLabel')}
              onEdit={() => router.back()}
            >
              {job && (
                <View style={styles.pillWrap}>
                  <Pill
                    label={urgencyLabel(job.urgency, t)}
                    variant={urgencyVariant(job.urgency)}
                  />
                  {job.urgency === 'SCHEDULED' && job.scheduledAt && (
                    <Text style={styles.scheduledDate}>
                      {job.scheduledAt.split('T')[0]}
                    </Text>
                  )}
                </View>
              )}
            </ReviewRow>
            <View style={styles.divider} />

            {/* Zone */}
            <ReviewRow
              label={t('homeowner.post.zoneRowLabel')}
              onEdit={() => router.back()}
            >
              <Text style={styles.valueText}>{job?.zone?.nameEn}</Text>
            </ReviewRow>
            <View style={styles.divider} />

            {/* Address */}
            <ReviewRow
              label={t('homeowner.post.addressRowLabel')}
              onEdit={() => router.back()}
            >
              <Text style={styles.valueText}>{job?.address}</Text>
            </ReviewRow>
            <View style={styles.divider} />

            {/* Phone — shared later, no Edit */}
            <ReviewRow label={t('homeowner.post.phoneRowLabel')}>
              <View style={styles.phoneWrap}>
                <Text style={styles.valueText}>{user?.phone ?? '—'}</Text>
                <Text style={styles.sharedLaterText}>
                  {t('homeowner.post.reviewSharedLater')}
                </Text>
              </View>
            </ReviewRow>
            <View style={styles.divider} />

            {/* Photos */}
            <ReviewRow
              label={t('homeowner.post.photosRowLabel')}
              onEdit={photoMedia.length > 0 ? () => router.back() : undefined}
            >
              {photoMedia.length > 0 ? (
                <View style={styles.thumbRow}>
                  {photoMedia.slice(0, 3).map((m) => (
                    <Image
                      key={m.id}
                      source={{ uri: m.url }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.noPhotosText}>{t('homeowner.post.noPhotos')}</Text>
              )}
            </ReviewRow>
          </View>

          {/* Privacy hint */}
          <View style={styles.privacyHint}>
            <MaterialCommunityIcons name="lock-outline" size={16} color={Colors.primary600} />
            <Text style={styles.privacyText}>{t('homeowner.post.reviewPrivacyHint')}</Text>
          </View>

          <View style={styles.footer}>
            <Button
              label={t('homeowner.post.publishJob')}
              onPress={handlePublish}
              variant="primary"
              loading={publishing}
              disabled={publishing}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s2,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.heading2.fontSize,
    fontWeight: Typography.heading2.fontWeight as any,
    color: Colors.gray900,
  },
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
  },

  // ── Scroll content ──
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s8,
  },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.s4,
    ...Shadows.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
  valueText: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },
  pillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  scheduledDate: {
    fontSize: Typography.label.fontSize,
    color: Colors.gray600,
  },
  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  sharedLaterText: {
    fontSize: 12,
    color: Colors.gray400,
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.sand,
  },
  noPhotosText: {
    fontSize: 13,
    color: Colors.gray400,
  },

  // ── Privacy hint ──
  privacyHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    backgroundColor: Colors.primary50,
    borderRadius: Radius.sm,
    padding: Spacing.s3,
    marginTop: Spacing.s4,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary600,
    lineHeight: 18,
    fontWeight: '500' as any,
  },

  // ── Footer ──
  footer: {
    marginTop: Spacing.s6,
  },
});
