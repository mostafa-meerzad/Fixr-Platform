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
import { useNotifStore } from '@/stores/notif.store';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { bidsService } from '@/services/bids.service';

interface BidJob {
  id: string;
  title: string;
  status: string;
  acceptedBidId?: string | null;
  zone?: { nameEn: string };
}

interface MineBid {
  id: string;
  job: BidJob;
}

const CHAT_STATUSES = [
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETION_REQUESTED',
  'COMPLETED',
];

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

  const renderItem = ({ item: job, index }: { item: BidJob; index: number }) => (
    <View>
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/(shared)/chat/${job.id}` as any)}
        activeOpacity={0.7}
      >
        <Avatar size={40} name={job.title} />
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {job.zone?.nameEn}
          </Text>
        </View>
        <Pill label={getStatusLabel(job.status, t)} variant={getStatusVariant(job.status)} />
      </TouchableOpacity>
      {index < jobs.length - 1 ? <Divider style={styles.divider} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{t('expert.messages.subtitle')}</Text>
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
          showsVerticalScrollIndicator={false}
          style={styles.list}
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
  subtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
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
  list: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
    backgroundColor: Colors.white,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...Typography.bodyMd,
  },
  rowMeta: {
    ...Typography.caption,
  },
  divider: {
    marginVertical: 0,
  },
});
