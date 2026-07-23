import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Button } from '@/components/ui/Button';
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
  'Late', 'Poor quality', 'Rude', 'Overcharged', 'No-show',
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

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function CenteredAvatar({ name }: { name?: string | null }) {
  return (
    <View style={avatarStyles.circle}>
      <Text style={avatarStyles.initials}>{getInitials(name)}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary600,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
});

// ─── Tag chip ─────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  variant: 'positive' | 'negative';
  onPress: () => void;
}

function TagChip({ label, selected, variant, onPress }: ChipProps) {
  const isNeg = variant === 'negative';
  return (
    <TouchableOpacity
      style={[
        chipStyles.chip,
        !selected && chipStyles.chipUnselected,
        selected && (isNeg ? chipStyles.chipNegSel : chipStyles.chipPosSel),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          chipStyles.text,
          !selected && chipStyles.textUnselected,
          selected && chipStyles.textSelected,
        ]}
      >
        {selected ? `✓ ${label}` : label}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipUnselected: {
    backgroundColor: Colors.white,
    borderColor: Colors.gray200,
  },
  chipPosSel: {
    backgroundColor: Colors.primary600,
    borderColor: Colors.primary600,
  },
  chipNegSel: {
    backgroundColor: Colors.danger600,
    borderColor: Colors.danger600,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textUnselected: {
    color: Colors.gray600,
  },
  textSelected: {
    color: Colors.white,
  },
});

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

  // ── Load job ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    jobsService
      .get(jobId)
      .then((res) => setJob(res.data as ReviewJobDetail))
      .catch(() => show({ message: t('common.error'), variant: 'error' }))
      .finally(() => setLoading(false));
  }, [jobId]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const isHomeowner = job ? user?.id === job.homeownerId : false;

  const otherPartyName = isHomeowner
    ? job?.acceptedBid?.expert?.user?.name ?? t('common.unknown')
    : job?.homeowner?.name ?? t('common.unknown');

  const screenTitle = isHomeowner
    ? t('shared.review.questionExpert', { name: otherPartyName })
    : t('shared.review.questionHomeowner');

  const positiveTags = isHomeowner ? HOMEOWNER_POSITIVE_TAGS : EXPERT_POSITIVE_TAGS;
  const negativeTags = isHomeowner ? HOMEOWNER_NEGATIVE_TAGS : EXPERT_NEGATIVE_TAGS;

  // Tags appear conditionally per rating
  const showPositiveTags = rating >= 4;
  const showNegativeTags = rating > 0 && rating <= 2;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleRating(value: number) {
    setRating(value);
    // Clear incompatible tag selections when rating changes quadrant
    if (value >= 4) setSelectedNegTags([]);
    if (value <= 2) setSelectedPosTags([]);
    if (value === 3) { setSelectedPosTags([]); setSelectedNegTags([]); }
  }

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

  // ── Submit ───────────────────────────────────────────────────────────────────

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

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar onSkip={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + title + subtitle */}
        <View style={styles.heroSection}>
          <CenteredAvatar name={otherPartyName} />
          <Text style={styles.questionText}>{screenTitle}</Text>
          <Text style={styles.subtitleText}>
            {job.title}{' '}
            <Text style={styles.subtitleDot}>·</Text>{' '}
            {t('shared.review.completed')}
          </Text>
        </View>

        {/* Star rating */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRating(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <MaterialCommunityIcons
                name="star"
                size={40}
                color={star <= rating ? Colors.amber : Colors.gray200}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Positive tags (rating ≥ 4) */}
        {showPositiveTags && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>{t('shared.review.whatWentWell')}</Text>
            <View style={styles.tagsWrap}>
              {positiveTags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  selected={selectedPosTags.includes(tag)}
                  variant="positive"
                  onPress={() => togglePosTag(tag)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Negative tags (rating ≤ 2) */}
        {showNegativeTags && (
          <View style={styles.tagSection}>
            <Text style={[styles.tagSectionLabel, styles.tagNegLabel]}>
              {t('shared.review.whatWentWrong')}
            </Text>
            <View style={styles.tagsWrap}>
              {negativeTags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  selected={selectedNegTags.includes(tag)}
                  variant="negative"
                  onPress={() => toggleNegTag(tag)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            {t('shared.review.commentLabel')}{' '}
            <Text style={styles.commentOptional}>{t('shared.review.commentOptional')}</Text>
          </Text>
          <View style={styles.commentCard}>
            <TextInput
              style={styles.commentInput}
              placeholder={t('shared.review.commentPlaceholder')}
              placeholderTextColor={Colors.gray400}
              value={comment}
              onChangeText={setComment}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit */}
        <Button
          label={t('shared.review.submit')}
          onPress={handleSubmit}
          disabled={rating === 0}
          loading={submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Top bar (floating back + skip) ──────────────────────────────────────────

function TopBar({ onSkip }: { onSkip?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
        <MaterialCommunityIcons name={Icons.back as any} size={IconSize.inline} color={Colors.gray900} />
      </TouchableOpacity>
      <View style={styles.topBarSpacer} />
      {onSkip && (
        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    flex: 1,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray600,
  },

  // ── Loading ───────────────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s10,
    gap: Spacing.s5,
  },

  // ── Hero section ─────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    gap: Spacing.s3,
    paddingTop: Spacing.s2,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.gray400,
    textAlign: 'center',
  },
  subtitleDot: {
    color: Colors.gray200,
  },

  // ── Stars ─────────────────────────────────────────────────────────────────────
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.s2,
  },

  // ── Tag section ──────────────────────────────────────────────────────────────
  tagSection: {
    gap: Spacing.s3,
  },
  tagSectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray900,
  },
  tagNegLabel: {
    color: Colors.danger600,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },

  // ── Comment section ───────────────────────────────────────────────────────────
  commentSection: {
    gap: Spacing.s2,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray900,
  },
  commentOptional: {
    fontWeight: '400',
    color: Colors.gray400,
  },
  commentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadows.sm,
    padding: Spacing.s4,
    minHeight: 120,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray900,
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
