import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { jobsService } from '@/services/jobs.service';
import { Colors, Radius, Spacing, Typography, Shadows } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { formatRelativeTime } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BidExpert {
  rating: number;
  verificationStatus: string;
  user: { id: string; name: string };
}

interface LiveBid {
  id: string;
  price: number;
  createdAt: string;
  expert: BidExpert;
}

interface LiveJob {
  id: string;
  title: string;
  urgency: 'EMERGENCY' | 'TODAY' | 'SCHEDULED';
  scheduledAt?: string;
  category?: { nameEn: string };
  zone: { nameEn: string };
  bids?: LiveBid[];
  _count: { bids: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function urgencyMeta(job: LiveJob): string {
  if (job.urgency === 'EMERGENCY') return 'emergency';
  if (job.urgency === 'TODAY') return 'needed today';
  if (job.scheduledAt) return `scheduled ${job.scheduledAt.split('T')[0]}`;
  return 'flexible';
}

// ─── BidCard ──────────────────────────────────────────────────────────────────

function BidCard({ bid }: { bid: LiveBid }) {
  const isVerified = bid.expert.verificationStatus === 'VERIFIED';
  const initials = getInitials(bid.expert.user.name);
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.avatarCircle}>
        <Text style={cardStyles.avatarText}>{initials}</Text>
      </View>
      <View style={cardStyles.info}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name}>{bid.expert.user.name}</Text>
          {isVerified && (
            <MaterialCommunityIcons name={Icons.verified as any} size={14} color={Colors.success600} />
          )}
        </View>
        <Text style={cardStyles.meta}>
          ★ {bid.expert.rating?.toFixed(1) ?? '—'} · {formatRelativeTime(bid.createdAt, 'en')}
        </Text>
      </View>
      <Text style={cardStyles.price}>{bid.price.toLocaleString()} ₾</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    gap: Spacing.s3,
    ...Shadows.sm,
    marginBottom: Spacing.s3,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700' as any,
    color: Colors.white,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s1,
  },
  name: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },
  meta: {
    fontSize: 12,
    color: Colors.gray400,
  },
  price: {
    fontSize: 16,
    fontWeight: '700' as any,
    color: Colors.gray900,
  },
});

// ─── CounterChip ──────────────────────────────────────────────────────────────

function CounterChip({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={[chipStyles.value, accent && chipStyles.valueAccent]}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s2,
    alignItems: 'center',
    gap: 2,
    ...Shadows.sm,
  },
  value: {
    fontSize: 18,
    fontWeight: '700' as any,
    color: Colors.gray900,
  },
  valueAccent: {
    color: Colors.primary600,
  },
  label: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'center',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SuccessScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<LiveJob | null>(null);
  const dotsAnim = useRef(new Animated.Value(0.4)).current;

  async function fetchJob() {
    try {
      const { data } = await jobsService.get(jobId);
      setJob(data as unknown as LiveJob);
    } catch {
      // silent — keep showing stale data
    }
  }

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 10_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotsAnim, { toValue: 0.35, duration: 500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [dotsAnim]);

  const bids = job?.bids ?? [];
  const bidCount = bids.length;
  const lowestBid = bidCount > 0 ? Math.min(...bids.map((b) => b.price)) : null;
  const categoryName = job?.category?.nameEn ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Check icon ── */}
        <View style={styles.checkCircle}>
          <MaterialCommunityIcons name="check" size={32} color={Colors.success600} />
        </View>

        <Text style={styles.heading}>{t('homeowner.post.successHeading')}</Text>
        <Text style={styles.subtitle}>
          {t('homeowner.post.successSubtitle', { category: categoryName })}
        </Text>

        {/* ── Job summary card ── */}
        {job && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle} numberOfLines={2}>{job.title}</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>{t('homeowner.post.successLive')}</Text>
              </View>
            </View>
            <Text style={styles.summaryMeta}>
              {categoryName}
              {job.zone?.nameEn ? ` · ${job.zone.nameEn}` : ''}
              {` · ${urgencyMeta(job)}`}
            </Text>

            <View style={styles.chipRow}>
              <CounterChip
                value={String(bidCount)}
                label={t('homeowner.post.successBidsSoFar')}
                accent
              />
              <CounterChip
                value="—"
                label={t('homeowner.post.successExpertsViewed')}
              />
              <CounterChip
                value={lowestBid != null ? `${lowestBid.toLocaleString()} ₾` : '—'}
                label={t('homeowner.post.successLowestBid')}
              />
            </View>
          </View>
        )}

        {/* ── Bids arriving ── */}
        <Text style={styles.sectionLabel}>{t('homeowner.post.successBidsArriving')}</Text>

        {bids.map((bid) => (
          <BidCard key={bid.id} bid={bid} />
        ))}

        {/* "typing" placeholder row */}
        <View style={styles.typingRow}>
          <Animated.View style={[styles.typingDots, { opacity: dotsAnim }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </Animated.View>
          <Text style={styles.typingText}>{t('homeowner.post.successTypingBids')}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Fixed bottom bar ── */}
      <View style={styles.bottomBar}>
        <Button
          label={t('homeowner.post.successCompareBids', { count: bidCount })}
          onPress={() =>
            router.replace({
              pathname: '/(homeowner)/job/[id]' as any,
              params: { id: jobId },
            })
          }
          variant="primary"
          style={styles.ctaButton}
        />
        <Button
          label={t('homeowner.post.successDone')}
          onPress={() => router.replace('/(homeowner)/home' as any)}
          variant="secondary"
          style={styles.ctaButton}
        />
      </View>
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

  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s8,
    alignItems: 'center',
  },

  // ── Check icon ──
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.success100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s4,
  },

  heading: {
    fontSize: Typography.display.fontSize,
    fontWeight: Typography.display.fontWeight as any,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.s2,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.s6,
    maxWidth: 300,
  },

  // ── Job summary card ──
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    marginBottom: Spacing.s6,
    ...Shadows.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    marginBottom: Spacing.s1,
  },
  summaryTitle: {
    flex: 1,
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight as any,
    color: Colors.gray900,
  },
  liveBadge: {
    backgroundColor: Colors.success100,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s2,
    paddingVertical: 3,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700' as any,
    color: Colors.success600,
    letterSpacing: 0.5,
  },
  summaryMeta: {
    fontSize: 13,
    color: Colors.gray400,
    marginBottom: Spacing.s4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },

  // ── Bids arriving ──
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight as any,
    color: Colors.gray900,
    marginBottom: Spacing.s3,
    width: '100%',
  },

  // ── Typing placeholder ──
  typingRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    borderWidth: 1.5,
    borderColor: Colors.sand,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: Spacing.s1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary600,
  },
  typingText: {
    fontSize: 13,
    color: Colors.gray400,
    fontStyle: 'italic',
  },

  bottomSpacer: {
    height: Spacing.s8,
  },

  // ── Bottom bar ──
  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s4,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  ctaButton: {
    flex: 1,
  },
});
