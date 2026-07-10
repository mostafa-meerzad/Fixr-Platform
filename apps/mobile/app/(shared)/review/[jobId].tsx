import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { jobsService, type JobStatus, type JobUrgency } from '@/services/jobs.service';
import { reviewsService } from '@/services/reviews.service';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewJobDetail {
  id: string;
  title: string;
  status: JobStatus;
  urgency: JobUrgency;
  homeownerId: string;
  homeowner: { id: string; name: string; avatarUrl: string | null };
  zone: { id: string; nameEn: string };
  acceptedBid?: {
    price: number;
    expert: {
      user: { id: string; name: string; avatarUrl: string | null };
    };
  } | null;
}

// ─── Tag definitions ──────────────────────────────────────────────────────────

const HOMEOWNER_POSITIVE_TAGS = [
  'Punctual', 'Quality work', 'Professional', 'Fair price', 'Great communication',
];
const HOMEOWNER_NEGATIVE_TAGS = [
  'Late', 'Poor quality', 'Unprofessional', 'Overpriced',
];
const EXPERT_POSITIVE_TAGS = [
  'Clear instructions', 'Respectful', 'Payment ready', 'Easy to work with',
];
const EXPERT_NEGATIVE_TAGS = [
  'Unclear instructions', 'Disrespectful', 'Changed scope',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildIsPositive(
  rating: number,
  posSelected: string[],
  negSelected: string[],
): boolean | undefined {
  if (rating >= 4 && posSelected.length > 0) return true;
  if (rating <= 2 && negSelected.length > 0) return false;
  return undefined;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const user = useAuthStore((s) => s.user);
  const { show } = useToast();

  const [job, setJob] = useState<ReviewJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedPosTags, setSelectedPosTags] = useState<string[]>([]);
  const [selectedNegTags, setSelectedNegTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  // ── Load job ────────────────────────────────────────────────────────────────

  useEffect(() => {
    jobsService
      .get(jobId)
      .then((res) => setJob(res.data as ReviewJobDetail))
      .catch(() =>
        show({ message: t('common.error'), variant: 'error' }),
      )
      .finally(() => setLoading(false));
  }, [jobId]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const isHomeowner = job ? user?.id === job.homeownerId : false;

  const otherPartyName = isHomeowner
    ? job?.acceptedBid?.expert?.user?.name ?? t('common.unknown')
    : job?.homeowner?.name ?? t('common.unknown');

  const otherPartyAvatar = isHomeowner
    ? job?.acceptedBid?.expert?.user?.avatarUrl ?? undefined
    : job?.homeowner?.avatarUrl ?? undefined;

  const otherPartySubtitle = isHomeowner
    ? `${job?.title ?? ''} · ${(job?.acceptedBid?.price ?? 0).toLocaleString()} AFN`
    : `${t('shared.review.homeowner')} · ${job?.zone?.nameEn ?? ''}`;

  const screenTitle = isHomeowner
    ? t('shared.review.questionExpert', { name: otherPartyName })
    : t('shared.review.questionHomeowner');

  const positiveTags = isHomeowner ? HOMEOWNER_POSITIVE_TAGS : EXPERT_POSITIVE_TAGS;
  const negativeTags = isHomeowner ? HOMEOWNER_NEGATIVE_TAGS : EXPERT_NEGATIVE_TAGS;
  const showNegativeTags = rating > 0 && rating <= 3;

  // ── Tag toggle ──────────────────────────────────────────────────────────────

  function togglePosTag(tag: string) {
    setSelectedPosTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function toggleNegTag(tag: string) {
    setSelectedNegTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  // Clear negative tags when rating goes above 3
  function handleRating(value: number) {
    setRating(value);
    if (value > 3) setSelectedNegTags([]);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (rating === 0) return;
    try {
      setSubmitting(true);
      const isPositive = buildIsPositive(rating, selectedPosTags, selectedNegTags);
      const tags = [...selectedPosTags, ...selectedNegTags];

      const payload: { rating: number; comment?: string; isPositive?: boolean; tags?: string[] } = {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(isPositive !== undefined ? { isPositive } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      };

      await reviewsService.submit(jobId, payload);
      show({ message: t('shared.review.successToast'), variant: 'success' });
      router.back();
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('48') || msg.toLowerCase().includes('window')) {
        show({ message: t('shared.review.errorWindowClosed'), variant: 'error' });
      } else {
        show({ message: t('common.error'), variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Other party card */}
        <View style={styles.partyRow}>
          <Avatar name={otherPartyName} uri={otherPartyAvatar} size={56} />
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>{otherPartyName}</Text>
            <Text style={styles.partySubtitle}>{otherPartySubtitle}</Text>
          </View>
        </View>

        {/* Question */}
        <Text style={styles.question}>{screenTitle}</Text>

        {/* Star rating */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRating(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <MaterialIcons
                name="star"
                size={36}
                color={star <= rating ? Colors.primary600 : Colors.gray200}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Positive tags (always shown) */}
        <View style={styles.tagsWrap}>
          {positiveTags.map((tag) => {
            const selected = selectedPosTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, selected && styles.chipPosSelected]}
                onPress={() => togglePosTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipPosSelectedText]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Negative tags (only when rating ≤ 3) */}
        {showNegativeTags && (
          <View style={styles.negSection}>
            <Text style={styles.negLabel}>{t('shared.review.whatWentWrong')}</Text>
            <View style={styles.tagsWrap}>
              {negativeTags.map((tag) => {
                const selected = selectedNegTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, selected && styles.chipNegSelected]}
                    onPress={() => toggleNegTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.chipText, selected && styles.chipNegSelectedText]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Comment */}
        <Input
          label=""
          placeholder={t('shared.review.commentPlaceholder')}
          value={comment}
          onChangeText={setComment}
          multiline
          style={styles.commentInput}
        />

        {/* Submit */}
        <Button
          label={t('shared.review.submit')}
          onPress={handleSubmit}
          disabled={rating === 0}
          loading={submitting}
        />

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Header (shared inside this file) ────────────────────────────────────────

function Header() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
        <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('shared.review.headerTitle')}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // ── Loading / error ──────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.s4,
    paddingBottom: Spacing.s10,
    gap: Spacing.s4,
  },

  // ── Other party ─────────────────────────────────────────────────────────────
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  partyInfo: {
    flex: 1,
    gap: 2,
  },
  partyName: {
    ...Typography.heading2,
  },
  partySubtitle: {
    ...Typography.label,
  },

  // ── Question ─────────────────────────────────────────────────────────────────
  question: {
    ...Typography.heading2,
    textAlign: 'center',
    color: Colors.gray900,
  },

  // ── Stars ────────────────────────────────────────────────────────────────────
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.s2,
  },

  // ── Tags ─────────────────────────────────────────────────────────────────────
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
  chipPosSelected: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary600,
  },
  chipPosSelectedText: {
    color: Colors.primary600,
  },
  chipNegSelected: {
    backgroundColor: Colors.danger100,
    borderColor: Colors.danger600,
  },
  chipNegSelectedText: {
    color: Colors.danger600,
  },

  // ── Negative section ─────────────────────────────────────────────────────────
  negSection: {
    gap: Spacing.s2,
  },
  negLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Comment ──────────────────────────────────────────────────────────────────
  commentInput: {
    minHeight: 100,
  },

  // ── Skip ─────────────────────────────────────────────────────────────────────
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.s2,
  },
  skipText: {
    ...Typography.body,
    color: Colors.gray400,
  },
});
