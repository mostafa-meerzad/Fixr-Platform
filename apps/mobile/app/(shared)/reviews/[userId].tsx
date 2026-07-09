import React, { useEffect, useState } from 'react';
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
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { reviewsService, type Review } from '@/services/reviews.service';
import { formatRelativeTime } from '@/utils/format';

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons
          key={i}
          name={(i <= rating ? 'star' : 'star-border') as any}
          size={18}
          color={i <= rating ? Colors.warning600 : Colors.gray400}
        />
      ))}
    </View>
  );
}

export default function UserReviewsScreen() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  function renderReview({ item }: { item: Review }) {
    const tagVariant =
      item.isPositive === true
        ? 'success'
        : item.isPositive === false
        ? 'danger'
        : 'gray';

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewerRow}>
          <Avatar size={32} name={item.reviewer.name} uri={item.reviewer.avatarUrl} />
          <Text style={styles.reviewerName}>{item.reviewer.name}</Text>
          <Text style={styles.reviewDate}>{formatRelativeTime(item.createdAt, 'en')}</Text>
        </View>
        <Stars rating={item.rating} />
        {item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, idx) => (
              <Pill key={idx} label={tag} variant={tagVariant} style={styles.tagPill} />
            ))}
          </View>
        )}
        {item.comment ? (
          <Text style={styles.comment}>{item.comment}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shared.reviews.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <EmptyState
          icon="error"
          title={t('common.error')}
          subtitle={error}
          action={{ label: t('common.retry'), onPress: load }}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="star"
          title={t('shared.reviews.empty')}
          subtitle={t('shared.reviews.emptySub')}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          ItemSeparatorComponent={() => <Divider />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
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
  },
  headerTitle: {
    ...Typography.heading1,
    color: Colors.primary600,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: Spacing.s2,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s4,
    gap: Spacing.s2,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  reviewerName: {
    ...Typography.bodyMd,
    flex: 1,
  },
  reviewDate: {
    ...Typography.caption,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  tagPill: {
    alignSelf: 'flex-start',
  },
  comment: {
    ...Typography.body,
    color: Colors.gray600,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
