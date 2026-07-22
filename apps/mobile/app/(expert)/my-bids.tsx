import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Icons } from '@/constants/icons';
import { bidsService } from '@/services/bids.service';
import { formatRelativeTime, formatAFNEn } from '@/utils/format';

interface Bid {
  id: string;
  price: number;
  estimatedArrivalMinutes: number;
  isWithdrawn?: boolean;
  isOutbid?: boolean;
  lowestBidPrice?: number;
  createdAt: string;
  job: {
    id: string;
    title: string;
    status: string;
    acceptedBidId?: string | null;
    zone?: { nameEn: string };
    _count?: { bids: number };
    homeowner?: { firstName: string };
  };
}

type TabView = 'active' | 'won' | 'lost';
type TFunc = (key: string, opts?: Record<string, string | number>) => string;

const ACTIVE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];

function getActiveBidState(bid: Bid): 'accepted' | 'outbid' | 'pending' {
  if (bid.job.acceptedBidId === bid.id && ACTIVE_STATUSES.includes(bid.job.status))
    return 'accepted';
  if (bid.isOutbid) return 'outbid';
  return 'pending';
}

function formatArrival(mins: number): string {
  if (mins < 60) return `${mins} min`;
  return `${Math.round(mins / 60)}h`;
}

export default function MyBidsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabView>('active');
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<Bid | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await bidsService.mine();
      const data = res.data as Bid[] | { data: Bid[] };
      setBids(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleWithdraw = useCallback((bid: Bid) => {
    setWithdrawTarget(bid);
  }, []);

  const confirmWithdraw = useCallback(async () => {
    if (!withdrawTarget) return;
    setWithdrawTarget(null);
    try {
      await bidsService.withdraw(withdrawTarget.id);
      await load();
    } catch {
      // silent — bid may already be withdrawn
    }
  }, [withdrawTarget, load]);

  // Classify bids into 3 tabs
  const activeBids = bids.filter(
    (b) =>
      !b.isWithdrawn &&
      (b.job.status === 'OPEN' || ACTIVE_STATUSES.includes(b.job.status)),
  );
  const wonBids = bids.filter(
    (b) => b.job.acceptedBidId === b.id && b.job.status === 'COMPLETED',
  );
  const lostBids = bids.filter((b) => {
    const isActive =
      !b.isWithdrawn &&
      (b.job.status === 'OPEN' || ACTIVE_STATUSES.includes(b.job.status));
    const isWon = b.job.acceptedBidId === b.id && b.job.status === 'COMPLETED';
    return !isActive && !isWon;
  });

  const tabs: Array<{ key: TabView; label: string }> = [
    { key: 'active', label: t('expert.myBids.active') },
    { key: 'won',    label: t('expert.myBids.won')    },
    { key: 'lost',   label: t('expert.myBids.lost')   },
  ];

  const currentData =
    activeTab === 'active' ? activeBids :
    activeTab === 'won'    ? wonBids    :
                             lostBids;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('expert.myBids.title')}</Text>
      </View>

      {/* Three-way toggle pills */}
      <View style={styles.toggleRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.togglePill,
              activeTab === tab.key && styles.togglePillActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                activeTab === tab.key
                  ? styles.toggleTextActive
                  : styles.toggleTextInactive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={load} style={styles.retryBtn} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={({ item: bid }) =>
            activeTab === 'active' ? (
              <ActiveBidCard bid={bid} t={t as TFunc} onWithdraw={handleWithdraw} />
            ) : activeTab === 'won' ? (
              <WonBidCard bid={bid} t={t as TFunc} />
            ) : (
              <LostBidCard bid={bid} t={t as TFunc} />
            )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            activeTab === 'active' ? (
              <EmptyState
                icon={Icons.gavel}
                title={t('expert.myBids.emptyBidsTitle')}
                subtitle={t('expert.myBids.emptyBidsSubtitle')}
              />
            ) : activeTab === 'won' ? (
              <EmptyState
                icon={Icons.checkCircle}
                title={t('expert.myBids.emptyWonTitle')}
                subtitle={t('expert.myBids.emptyWonSubtitle')}
              />
            ) : (
              <EmptyState
                icon={Icons.history}
                title={t('expert.myBids.emptyLostTitle')}
                subtitle={t('expert.myBids.emptyLostSubtitle')}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary600}
            />
          }
        />
      )}

      <ConfirmDialog
        visible={withdrawTarget !== null}
        title={t('expert.myBids.withdrawConfirmTitle')}
        message={t('expert.myBids.withdrawConfirmMsg')}
        confirmLabel={t('expert.myBids.withdraw')}
        cancelLabel={t('common.cancel')}
        confirmVariant="destructive"
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />
    </SafeAreaView>
  );
}

// ── Active tab — dispatches to the correct card variant ──────────────────────

function ActiveBidCard({
  bid,
  t,
  onWithdraw,
}: {
  bid: Bid;
  t: TFunc;
  onWithdraw: (bid: Bid) => void;
}) {
  const state = getActiveBidState(bid);
  const arrival = formatArrival(bid.estimatedArrivalMinutes);

  // ACCEPTED — success green border, two side-by-side buttons
  if (state === 'accepted') {
    const homeownerName = bid.job.homeowner?.firstName ?? '';
    const meta = [
      `${t('expert.myBids.yourBid')} ${formatAFNEn(bid.price)}`,
      `${t('expert.myBids.arrivePre')} ~${arrival}`,
      bid.job.zone?.nameEn,
    ].filter(Boolean).join(' · ');

    return (
      <Card style={styles.acceptedCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{bid.job.title}</Text>
          <Pill label={t('expert.myBids.statusAccepted')} variant="success" />
        </View>
        <Text style={styles.cardMeta}>{meta}</Text>
        <View style={styles.buttonRow}>
          <View style={styles.buttonHalf}>
            <Button
              label={t('expert.myBids.ctaOnMyWay')}
              variant="success"
              onPress={() => router.push(`/(expert)/active-job/${bid.job.id}` as any)}
            />
          </View>
          <View style={styles.buttonHalf}>
            <Button
              label={t('expert.myBids.message', { name: homeownerName })}
              variant="secondary"
              onPress={() => router.push(`/(shared)/chat/${bid.job.id}` as any)}
            />
          </View>
        </View>
      </Card>
    );
  }

  // OUTBID — terra cotta "Outbid" pill, "Lower my bid" CTA
  if (state === 'outbid') {
    const meta = [
      `${t('expert.myBids.yourBid')} ${formatAFNEn(bid.price)}`,
      bid.lowestBidPrice != null
        ? `${t('expert.myBids.lowestNow')} ${formatAFNEn(bid.lowestBidPrice)}`
        : null,
      bid.job.zone?.nameEn,
    ].filter(Boolean).join(' · ');

    return (
      <Card style={styles.bidCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{bid.job.title}</Text>
          <Pill label={t('expert.myBids.statusOutbid')} variant="primary" />
        </View>
        <Text style={styles.cardMeta}>{meta}</Text>
        <Button
          label={t('expert.myBids.lowerMyBid')}
          onPress={() => router.push(`/(expert)/job/${bid.job.id}` as any)}
          style={styles.actionBtn}
        />
      </Card>
    );
  }

  // PENDING — amber pill, ghost "Edit bid" + "Withdraw" row
  const bidCount = bid.job._count?.bids;
  const meta = [
    `${t('expert.myBids.yourBid')} ${formatAFNEn(bid.price)}`,
    bid.job.zone?.nameEn,
    bidCount != null ? `${bidCount} ${t('expert.myBids.bidsTotal')}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Card style={styles.bidCard}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={2}>{bid.job.title}</Text>
        <Pill label={t('expert.myBids.statusPending')} variant="warning" />
      </View>
      <Text style={styles.cardMeta}>{meta}</Text>
      <View style={styles.ghostRow}>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.push(`/(expert)/job/${bid.job.id}` as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>{t('expert.myBids.editBid')}</Text>
        </TouchableOpacity>
        <View style={styles.ghostSeparator} />
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => onWithdraw(bid)}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>{t('expert.myBids.withdraw')}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ── Won tab card ─────────────────────────────────────────────────────────────

function WonBidCard({ bid, t }: { bid: Bid; t: TFunc }) {
  const meta = [
    bid.job.zone?.nameEn,
    bid.createdAt ? formatRelativeTime(bid.createdAt, 'en') : null,
  ].filter(Boolean).join(' · ');

  return (
    <Card
      style={styles.bidCard}
      onPress={() => router.push(`/(expert)/active-job/${bid.job.id}` as any)}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={2}>{bid.job.title}</Text>
        <Pill label={t('common.status.completed')} variant="success" />
      </View>
      <Text style={styles.cardMeta}>{meta}</Text>
      <Divider style={styles.cardDivider} />
      <Text style={styles.wonPrice}>{formatAFNEn(bid.price)}</Text>
    </Card>
  );
}

// ── Lost tab card ─────────────────────────────────────────────────────────────

function LostBidCard({ bid, t }: { bid: Bid; t: TFunc }) {
  const statusLabel = bid.isWithdrawn
    ? t('expert.myBids.statusWithdrawn')
    : t('expert.myBids.statusNotSelected');
  const meta = [
    bid.job.zone?.nameEn,
    bid.createdAt ? formatRelativeTime(bid.createdAt, 'en') : null,
  ].filter(Boolean).join(' · ');

  return (
    <Card style={styles.bidCard}>
      <View style={styles.cardTopRow}>
        <Text style={[styles.cardTitle, styles.lostTitle]} numberOfLines={2}>
          {bid.job.title}
        </Text>
        <Pill label={statusLabel} variant="gray" />
      </View>
      <Text style={styles.cardMeta}>{meta}</Text>
      <Text style={styles.lostPrice}>{formatAFNEn(bid.price)}</Text>
    </Card>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  title: {
    ...Typography.display,
  },

  // ── Three-way toggle ────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  togglePill: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  togglePillActive: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.white,
  },
  toggleTextInactive: {
    color: Colors.gray600,
  },

  // ── Feed ───────────────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.s4,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.s3,
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

  // ── Shared card base ────────────────────────────────────────────────────────
  bidCard: {
    gap: Spacing.s2,
  },
  acceptedCard: {
    gap: Spacing.s2,
    borderColor: Colors.success600,
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.s2,
  },
  cardTitle: {
    ...Typography.heading3,
    color: Colors.gray900,
    flex: 1,
  },
  cardMeta: {
    ...Typography.caption,
  },
  cardDivider: {
    marginVertical: Spacing.s1,
  },

  // ── Accepted card ────────────────────────────────────────────────────────────
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    marginTop: Spacing.s1,
  },
  buttonHalf: {
    flex: 1,
  },

  // ── Outbid card ──────────────────────────────────────────────────────────────
  actionBtn: {
    marginTop: Spacing.s1,
  },

  // ── Pending card ghost buttons ───────────────────────────────────────────────
  ghostRow: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    marginTop: Spacing.s1,
    overflow: 'hidden',
  },
  ghostBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostSeparator: {
    width: 1.5,
    backgroundColor: Colors.gray200,
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary600,
  },

  // ── Won card ─────────────────────────────────────────────────────────────────
  wonPrice: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Colors.success600,
  },

  // ── Lost card ─────────────────────────────────────────────────────────────────
  lostTitle: {
    color: Colors.gray600,
  },
  lostPrice: {
    ...Typography.caption,
    color: Colors.gray400,
  },
});
