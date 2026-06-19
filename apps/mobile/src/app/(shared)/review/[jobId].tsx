import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StarRating } from '../../../components/ui/StarRating';
import { reviewsService } from '../../../services/reviews.service';
import { Colors, Spacing, Radius } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';

const POSITIVE_TAGS = ['professional', 'onTime', 'goodQuality', 'clean', 'friendly'];
const NEGATIVE_TAGS = ['late', 'poorQuality', 'noShow', 'unprofessional'];

export default function ReviewScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [positives, setPositives] = useState<string[]>([]);
  const [negatives, setNegatives] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');

  function toggleTag(tag: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  async function handleSubmit() {
    if (rating === 0) {
      setRatingError(t('error'));
      return;
    }
    setRatingError('');
    setSubmitting(true);
    try {
      await reviewsService.submit(jobId, {
        rating,
        comment: comment.trim() || undefined,
        positivePoints: positives.length ? positives : undefined,
        negativePoints: negatives.length ? negatives : undefined,
      });
      Alert.alert('', t('jobCompleted'), [
        { text: t('confirm'), onPress: () => router.replace('/(homeowner)/jobs') },
      ]);
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message ?? t('error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenWrapper scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
      </TouchableOpacity>

      <Text variant="h2" style={{ textAlign }}>{t('leaveReview')}</Text>

      {/* Star picker */}
      <Card style={styles.card}>
        <Text variant="label" style={{ textAlign }}>{t('rating')}</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => { setRating(s); setRatingError(''); }}>
              <Text variant="h1" color={s <= rating ? Colors.star : Colors.starEmpty}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {ratingError && <Text variant="xs" color={Colors.danger}>{ratingError}</Text>}
      </Card>

      {/* Positive tags */}
      {rating >= 4 && (
        <View style={styles.tagSection}>
          <Text variant="label" style={{ textAlign }}>{t('addNote')}</Text>
          <View style={styles.tagRow}>
            {POSITIVE_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag, positives, setPositives)}
                style={[styles.tag, positives.includes(tag) && styles.tagActivePositive]}
              >
                <Text variant="xs" color={positives.includes(tag) ? Colors.primary : Colors.textSecondary}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Negative tags */}
      {rating <= 2 && rating > 0 && (
        <View style={styles.tagSection}>
          <Text variant="label" style={{ textAlign }}>{t('addNote')}</Text>
          <View style={styles.tagRow}>
            {NEGATIVE_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag, negatives, setNegatives)}
                style={[styles.tag, negatives.includes(tag) && styles.tagActiveNegative]}
              >
                <Text variant="xs" color={negatives.includes(tag) ? Colors.danger : Colors.textSecondary}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Input
        label={t('addNote')}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Button
        label={t('submit')}
        onPress={handleSubmit}
        loading={submitting}
        fullWidth
        style={styles.btn}
      />
      <Button
        label={t('cancel')}
        variant="ghost"
        onPress={() => router.replace('/(homeowner)/jobs')}
        fullWidth
        style={{ marginBottom: Spacing.xxxl }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  card: { gap: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  starRow: { flexDirection: 'row', gap: Spacing.sm },
  tagSection: { marginBottom: Spacing.lg },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  tagActivePositive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  tagActiveNegative: { borderColor: Colors.danger, backgroundColor: 'rgba(232,93,93,0.1)' },
  btn: { marginTop: Spacing.xl, marginBottom: Spacing.sm },
});
