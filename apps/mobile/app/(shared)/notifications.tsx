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
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import { useNotifStore } from '@/stores/notif.store';
import { notificationsService } from '@/services/notifications.service';
import { navigateFromNotification } from '@/utils/notificationRouter';
import { formatRelativeTime } from '@/utils/format';

interface AppNotification {
  id: string;
  type: string;
  titleEn: string;
  bodyEn: string;
  isRead: boolean;
  data: { jobId?: string } | null;
  sentAt: string;
}

const ICON_MAP: Record<string, string> = {
  BID_RECEIVED: 'gavel',
  BID_ACCEPTED: 'check-circle',
  BID_REJECTED: 'cancel',
  BID_WITHDRAWN: 'undo',
  JOB_ASSIGNED: 'assignment-turned-in',
  JOB_CANCELLED: 'cancel',
  JOB_COMPLETED: 'task-alt',
  COMPLETION_REQUESTED: 'hourglass-empty',
  EXPERT_VERIFIED: 'verified',
  EXPERT_REJECTED: 'gpp-bad',
  DISPUTE_OPENED: 'report-problem',
  DISPUTE_RESOLVED: 'handshake',
  JOB_PUBLISHED: 'work',
};

function notifIcon(type: string): string {
  return ICON_MAP[type] ?? 'notifications';
}

const PAGE_SIZE = 30;

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotifStore((s) => s.unreadCount);
  const setUnreadCount = useNotifStore((s) => s.setUnreadCount);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsService.list(1, PAGE_SIZE);
      const body = res.data;
      const data: AppNotification[] = body?.data ?? [];
      setItems(data);
      setHasMore(data.length >= PAGE_SIZE);
      setPage(1);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await notificationsService.list(next, PAGE_SIZE);
      const newData: AppNotification[] = res.data?.data ?? [];
      setItems((prev) => [...prev, ...newData]);
      setHasMore(newData.length >= PAGE_SIZE);
      setPage(next);
    } catch {
      // silent — user can retry by scrolling again
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  }

  function handleTap(item: AppNotification) {
    if (!item.isRead) {
      notificationsService.markRead(item.id); // fire-and-forget
      setUnreadCount(Math.max(0, unreadCount - 1));
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
    }
    const jobId = item.data?.jobId;
    navigateFromNotification({ type: item.type, jobId }, user?.role);
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
      </TouchableOpacity>
      <Text style={styles.title}>{t('shared.notifications.title')}</Text>
      <TouchableOpacity
        onPress={handleMarkAllRead}
        disabled={markingAll}
        style={styles.markAllBtn}
      >
        <Text style={[styles.markAllText, markingAll && styles.markAllDisabled]}>
          {t('shared.notifications.markAllRead')}
        </Text>
      </TouchableOpacity>
    </View>
  );

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}

      {items.length === 0 ? (
        <EmptyState
          icon={Icons.notifs}
          title={t('shared.notifications.empty')}
          subtitle={t('shared.notifications.emptySub')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary600} size="small" />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, !item.isRead && styles.rowUnread]}
              onPress={() => handleTap(item)}
              activeOpacity={0.7}
            >
              {/* Left: rounded-square icon — terra cotta when unread, gray when read */}
              <View style={[
                styles.iconSquare,
                item.isRead ? styles.iconSquareRead : styles.iconSquareUnread,
              ]}>
                <MaterialIcons
                  name={notifIcon(item.type) as any}
                  size={IconSize.inline}
                  color={item.isRead ? Colors.gray400 : Colors.primary600}
                />
              </View>

              {/* Middle: title + body + time */}
              <View style={styles.textCol}>
                <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]} numberOfLines={1}>
                  {item.titleEn}
                </Text>
                <Text style={styles.notifBody} numberOfLines={2}>
                  {item.bodyEn}
                </Text>
                <Text style={styles.notifTime}>
                  {formatRelativeTime(item.sentAt, 'en')}
                </Text>
              </View>

              {/* Right: unread dot */}
              {!item.isRead ? (
                <View style={styles.unreadDot} />
              ) : null}
            </TouchableOpacity>
          )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.s3,
  },
  title: {
    ...Typography.heading1,
    color: Colors.primary600,
    flex: 1,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingLeft: Spacing.s3,
  },
  markAllText: {
    ...Typography.label,
    color: Colors.primary600,
  },
  markAllDisabled: {
    opacity: 0.4,
  },

  // List row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    backgroundColor: Colors.white,
    gap: Spacing.s3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
  },
  rowUnread: {
    backgroundColor: Colors.primary50,
  },

  // Icon — rounded square, read/unread variants
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconSquareUnread: {
    backgroundColor: Colors.primary100,
  },
  iconSquareRead: {
    backgroundColor: Colors.gray100,
  },

  // Unread dot — far right of row
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger600,
    flexShrink: 0,
  },

  // Text column
  textCol: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    ...Typography.bodyMd,
    color: Colors.gray600,
  },
  notifTitleUnread: {
    color: Colors.gray900,
  },
  notifBody: {
    ...Typography.body,
  },
  notifTime: {
    ...Typography.caption,
  },

  footerLoader: {
    paddingVertical: Spacing.s4,
    alignItems: 'center',
  },
});
