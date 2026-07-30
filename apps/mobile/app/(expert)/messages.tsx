import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotifStore } from '@/stores/notif.store';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { bidsService } from '@/services/bids.service';
import { formatRelativeTime } from '@/utils/format';

interface BidJob {
  id: string;
  title: string;
  status: string;
  acceptedBidId?: string | null;
  zone?: { nameEn: string };
  createdAt: string;
}

interface MineBid {
  id: string;
  job: BidJob;
}

const CHAT_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED'];
const ONLINE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

function getStatusLabel(status: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    ASSIGNED: t('common.status.assigned'),
    EN_ROUTE: t('common.status.enRoute'),
    ARRIVED: t('common.status.arrived'),
    IN_PROGRESS: t('common.status.inProgress'),
    COMPLETION_REQUESTED: t('common.status.completionRequested'),
    COMPLETED: t('common.status.completed'),
  };
  return map[status] ?? status;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export default function ExpertMessagesScreen() {
  const { t } = useTranslation();
  const clearUnreadChat = useNotifStore((s) => s.clearUnreadChat);
  const [jobs, setJobs] = useState<BidJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await bidsService.mine();
      const raw = res.data as MineBid[] | { data: MineBid[] };
      const allBids = Array.isArray(raw) ? raw : raw.data ?? [];
      setJobs(
        allBids
          .filter((b) => b.job.acceptedBidId === b.id && CHAT_STATUSES.includes(b.job.status))
          .map((b) => b.job),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    clearUnreadChat();
    load();
  }, [load]));

  const renderItem = ({ item: job }: { item: BidJob }) => {
    const isOnline = ONLINE_STATUSES.includes(job.status);
    const timestamp = formatRelativeTime(job.createdAt, 'en');

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/(shared)/chat/${job.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(job.title)}</Text>
          </View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.rowExcerpt} numberOfLines={1}>
            {job.zone?.nameEn ?? ''}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.timestamp}>{timestamp}</Text>
          <Pill label={getStatusLabel(job.status, t)} variant={getStatusVariant(job.status)} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('expert.messages.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon={Icons.chatNone}
              title={t('expert.messages.emptyTitle')}
              subtitle={t('expert.messages.emptySubtitle')}
            />
          }
          ListFooterComponent={
            jobs.length > 0 ? (
              <View style={styles.lockHint}>
                <MaterialCommunityIcons name={Icons.info as any} size={14} color={Colors.gray400} />
                <Text style={styles.lockHintText}>{t('expert.messages.lockHint')}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.s4,
    gap: Spacing.s3,
    flexGrow: 1,
  },

  // ── Conversation row card ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    gap: Spacing.s3,
    ...Shadows.sm,
  },

  // ── Avatar with online dot ──
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.success600,
    borderWidth: 2,
    borderColor: Colors.white,
  },

  // ── Row content ──
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    ...Typography.bodyMd,
  },
  rowExcerpt: {
    ...Typography.caption,
  },

  // ── Timestamp + pill column ──
  rowRight: {
    alignItems: 'flex-end',
    gap: Spacing.s1,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.gray400,
  },

  // ── Lock hint footer ──
  lockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s1,
    marginTop: Spacing.s2,
    paddingVertical: Spacing.s3,
  },
  lockHintText: {
    fontSize: 12,
    color: Colors.gray400,
  },
});
