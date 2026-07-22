import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { reviewsService, type Review } from '@/services/reviews.service';
import { formatRelativeTime } from '@/utils/format';

// ─── Mini stars (amber, right-aligned in reviewer row) ───────────────────────

function MiniStars({ rating }: { rating: number }) {
  return (
    <View style={styles.miniStarsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons
          key={i}
          name="star"
          size={14}
          color={i <= rating ? Colors.amber : Colors.gray200}
        />
      ))}
    </View>
  );
}

// ─── Summary stars (decorative, below big score) ─────────────────────────────

function SummaryStars() {
  return (
    <View style={styles.summaryStarsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons key={i} name="star" size={18} color={Colors.amber} />
      ))}
    </View>
  );
}

// ─── Rating summary card ──────────────────────────────────────────────────────

interface RatingSummaryProps {
  reviews: Review[];
}

function RatingSummaryCard({ reviews }: RatingSummaryProps) {
  const { t } = useTranslation();
  const total = reviews.length;

  const { avg, dist, maxCount } = useMemo(() => {
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    const max = Math.max(...distribution.map((d) => d.count), 1);
    return { avg: average, dist: distribution, maxCount: max };
  }, [reviews, total]);

  return (
    <View style={styles.summaryCard}>
      {/* Left: score + stars + count */}
      <View style={styles.summaryLeft}>
        <Text style={styles.summaryScore}>{avg.toFixed(1)}</Text>
        <SummaryStars />
        <Text style={styles.summaryCount}>
          {t('shared.reviews.reviewCount', { count: total })}
        </Text>
      </View>

      {/* Right: bar chart 5→1 */}
      <View style={styles.summaryBars}>
        {dist.map(({ star, count }) => (
          <View key={star} style={styles.barRow}>
            <Text style={styles.barLabel}>{star}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round((count / maxCount) * 100)}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ item }: { item: Review }) {
  const subtitle = [
    item.job?.title,
    formatRelativeTime(item.createdAt, 'en'),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.reviewCard}>
      {/* Reviewer row: avatar + name/subtitle + stars */}
      <View style={styles.reviewerRow}>
        <Avatar size={40} name={item.reviewer.name} uri={item.reviewer.avatarUrl} />
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerNameRow}>
            <Text style={styles.reviewerName} numberOfLines={1}>
              {item.reviewer.name}
            </Text>
            <MiniStars rating={item.rating} />
          </View>
          {subtitle ? (
            <Text style={styles.reviewerSub} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Tag chips */}
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Comment in quotes */}
      {item.comment ? (
        <Text style={styles.comment}>{`"${item.comment}"`}</Text>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UserReviewsScreen() {
  const { t } = useTranslation();
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headerTitle = name
    ? `${t('shared.reviews.title')} · ${name}`
    : t('shared.reviews.title');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await reviewsService.getForUser(userId);
      setReviews(res.data);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Header bar (always visible) ────────────────────────────────────────────

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {headerTitle}
      </Text>
    </View>
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <EmptyState
          icon="error"
          title={t('common.error')}
          subtitle={error}
          action={{ label: t('common.retry'), onPress: load }}
        />
      </SafeAreaView>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (reviews.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <EmptyState
          icon="star"
          title={t('shared.reviews.empty')}
          subtitle={t('shared.reviews.emptySub')}
        />
      </SafeAreaView>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<RatingSummaryCard reviews={reviews} />}
        renderItem={({ item }) => <ReviewCard item={item} />}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header bar ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    ...Typography.heading1,
    flex: 1,
  },

  // ── List ────────────────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.s4,
    gap: Spacing.s3,
  },

  // ── Rating summary card ──────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    padding: Spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s4,
  },
  summaryLeft: {
    alignItems: 'center',
    gap: Spacing.s1,
    minWidth: 80,
  },
  summaryScore: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.gray900,
    lineHeight: 44,
  },
  summaryStarsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray400,
  },
  summaryBars: {
    flex: 1,
    gap: Spacing.s1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray400,
    width: 10,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.sand,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary600,
    borderRadius: Radius.full,
  },

  // ── Review card ──────────────────────────────────────────────────────────────
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s3,
  },
  reviewerInfo: {
    flex: 1,
    gap: 3,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.s2,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  reviewerSub: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.gray400,
  },
  miniStarsRow: {
    flexDirection: 'row',
    gap: 1,
    flexShrink: 0,
  },

  // ── Tags ─────────────────────────────────────────────────────────────────────
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  tagChip: {
    backgroundColor: Colors.sand,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.s3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray900,
  },

  // ── Comment ───────────────────────────────────────────────────────────────────
  comment: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.gray600,
    fontStyle: 'italic',
    lineHeight: 21,
  },
});
