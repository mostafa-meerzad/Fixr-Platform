import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { usersService, type PublicExpertProfile } from '@/services/users.service';
import { reviewsService, type Review } from '@/services/reviews.service';
import { formatRelativeTime } from '@/utils/format';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_W - Spacing.s4 * 2 - Spacing.s2 * 2) / 3;

// ─── StarRow ──────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialCommunityIcons
          key={n}
          name={Icons.star as any}
          size={14}
          color={n <= Math.round(rating) ? Colors.amber : Colors.gray200}
        />
      ))}
    </View>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ReviewCard({ review, t }: ReviewCardProps) {
  return (
    <Card style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar size={36} name={review.reviewer.name} uri={review.reviewer.avatarUrl} />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewer.name}</Text>
          <Text style={styles.reviewTime}>{formatRelativeTime(review.createdAt, 'en')}</Text>
        </View>
        <StarRow rating={review.rating} />
      </View>
      {review.tags.length > 0 && (
        <View style={styles.tagRow}>
          {review.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      {review.comment ? (
        <Text style={styles.reviewQuote}>"{review.comment}"</Text>
      ) : null}
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpertPublicProfileScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<PublicExpertProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  const load = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);
      const [profileRes, reviewsRes] = await Promise.all([
        usersService.getExpertProfile(id),
        reviewsService.getForUser(id),
      ]);
      setProfile(profileRes.data as PublicExpertProfile);
      setReviews((reviewsRes.data as Review[]).slice(0, 3));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('homeowner.expertPublicProfile.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('homeowner.expertPublicProfile.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isVerified = profile.verificationStatus === 'VERIFIED';
  const shopZone = profile.serviceZones[0]?.zone;
  const tradeNames = profile.serviceCategories.map((sc) => sc.category.nameEn);

  const onTimePct =
    profile.positivePoints + profile.negativePoints > 0
      ? Math.round(
          (profile.positivePoints / (profile.positivePoints + profile.negativePoints)) * 100,
        )
      : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
          <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('homeowner.expertPublicProfile.title')}</Text>
        <TouchableOpacity style={styles.backCircle}>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Profile hero ── */}
        <View style={styles.heroSection}>
          <Avatar size={80} name={profile.user.name} uri={profile.user.avatarUrl} verified={isVerified} />

          <Text style={styles.expertName}>{profile.user.name}</Text>

          {/* Trade + zone subtitle */}
          {(tradeNames.length > 0 || shopZone) ? (
            <Text style={styles.expertSubtitle}>
              {tradeNames[0] ?? ''}
              {tradeNames[0] && shopZone ? ' · ' : ''}
              {shopZone?.nameEn ?? ''}
              {shopZone ? ', Kabul' : ''}
            </Text>
          ) : null}

          {/* Verification pills */}
          <View style={styles.pillRow}>
            {isVerified && (
              <View style={styles.verifiedPill}>
                <MaterialCommunityIcons name={Icons.verified as any} size={12} color={Colors.success600} />
                <Text style={styles.verifiedPillText}>
                  {t('homeowner.expertPublicProfile.idVerified')}
                </Text>
              </View>
            )}
            {profile.positivePoints >= 10 && (
              <View style={styles.guildPill}>
                <MaterialCommunityIcons name={Icons.star as any} size={12} color={Colors.amber} />
                <Text style={styles.guildPillText}>
                  {t('homeowner.expertPublicProfile.guildMember')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsCard}>
          <StatTile
            value={profile.rating > 0 ? profile.rating.toFixed(1) : '—'}
            label={t('homeowner.expertPublicProfile.statRating')}
            icon={Icons.star}
            iconColor={Colors.amber}
          />
          <View style={styles.statDivider} />
          <StatTile
            value={String(profile.completedJobs)}
            label={t('homeowner.expertPublicProfile.statJobs')}
          />
          <View style={styles.statDivider} />
          <StatTile
            value={String(profile.positivePoints)}
            label={t('homeowner.expertPublicProfile.statPositive')}
          />
          {onTimePct !== null && (
            <>
              <View style={styles.statDivider} />
              <StatTile
                value={`${onTimePct}%`}
                label={t('homeowner.expertPublicProfile.statOnTime')}
              />
            </>
          )}
        </View>

        {/* ── No-show warning ── */}
        {profile.noShowCount > 0 && (
          <View style={styles.noShowBanner}>
            <MaterialCommunityIcons name={Icons.warning as any} size={IconSize.status} color={Colors.danger600} />
            <Text style={styles.noShowText}>
              {t('homeowner.expertPublicProfile.noShowWarning', { count: profile.noShowCount })}
            </Text>
          </View>
        )}

        {/* ── Bio ── */}
        {profile.description ? (
          <View style={styles.section}>
            <Text style={styles.bodyText}>{profile.description}</Text>
          </View>
        ) : null}

        {/* ── Trades / services ── */}
        {tradeNames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t('homeowner.expertPublicProfile.servicesLabel')}
            </Text>
            <View style={styles.tradePillRow}>
              {tradeNames.map((name) => (
                <View key={name} style={styles.tradePill}>
                  <Text style={styles.tradePillText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Past work (placeholder — not yet in API) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>
              {t('homeowner.expertPublicProfile.pastWorkLabel')}
            </Text>
          </View>
          <View style={styles.photoGrid}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.photoSlot}>
                <MaterialCommunityIcons name={Icons.image as any} size={28} color={Colors.gray200} />
              </View>
            ))}
          </View>
          <Text style={styles.pastWorkHint}>
            {t('homeowner.expertPublicProfile.noPhotosYet')}
          </Text>
        </View>

        {/* ── Reviews ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('homeowner.expertPublicProfile.reviewsLabel')}
          </Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>
              {t('homeowner.expertPublicProfile.noReviewsYet')}
            </Text>
          ) : (
            <View style={styles.reviewList}>
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} t={t} />
              ))}
            </View>
          )}
        </View>

        {/* Bottom padding to clear fixed CTA bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Fixed bottom CTAs ── */}
      <View style={styles.ctaBar}>
        <Button
          label={t('homeowner.expertPublicProfile.inviteToBid')}
          onPress={() => router.back()}
          style={styles.ctaPrimary}
        />
        <Button
          label={t('homeowner.expertPublicProfile.chat')}
          variant="dark"
          onPress={() => router.back()}
          style={styles.ctaDark}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  value: string;
  label: string;
  icon?: string;
  iconColor?: string;
}

function StatTile({ value, label, icon, iconColor }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statValueRow}>
        {icon ? (
          <MaterialCommunityIcons name={icon as any} size={14} color={iconColor ?? Colors.primary600} />
        ) : null}
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    gap: Spacing.s3,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s4,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary600,
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
    flexGrow: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s6,
    paddingBottom: Spacing.s8,
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    gap: Spacing.s2,
    marginBottom: Spacing.s4,
  },
  expertName: {
    ...Typography.heading1,
    marginTop: Spacing.s2,
  },
  expertSubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    marginTop: Spacing.s1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success100,
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  guildPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning100,
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  guildPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Stats ───────────────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray400,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    alignSelf: 'stretch',
    marginVertical: Spacing.s1,
  },

  // ── No-show banner ──────────────────────────────────────────────────────────
  noShowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: Colors.danger100,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.sm,
    marginBottom: Spacing.s4,
  },
  noShowText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger600,
    flex: 1,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    gap: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bodyText: {
    ...Typography.body,
    lineHeight: 22,
  },
  emptyText: {
    ...Typography.caption,
    textAlign: 'center',
    paddingVertical: Spacing.s4,
  },

  // ── Trade pills ─────────────────────────────────────────────────────────────
  tradePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  tradePill: {
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary100,
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.full,
  },
  tradePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary600,
  },

  // ── Photo grid (past work) ───────────────────────────────────────────────────
  photoGrid: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  photoSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastWorkHint: {
    ...Typography.caption,
    textAlign: 'center',
  },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  reviewList: {
    gap: Spacing.s3,
  },
  reviewCard: {
    gap: Spacing.s2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  reviewerInfo: {
    flex: 1,
    gap: 2,
  },
  reviewerName: {
    ...Typography.bodyMd,
    fontSize: 14,
  },
  reviewTime: {
    ...Typography.caption,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s1,
  },
  tagChip: {
    backgroundColor: Colors.primary50,
    paddingVertical: 3,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primary600,
  },
  reviewQuote: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: Colors.gray600,
  },

  // ── Bottom CTA bar ───────────────────────────────────────────────────────────
  ctaBar: {
    flexDirection: 'row',
    gap: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s4,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  ctaPrimary: {
    flex: 1,
  },
  ctaDark: {
    flex: 1,
  },
});
