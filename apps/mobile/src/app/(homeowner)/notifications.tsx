import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { notificationsService } from '../../services/notifications.service';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationsService.list();
      setItems(res.data?.data?.items ?? []);
      setUnread(res.data?.data?.unreadCount ?? 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  function onRefresh() { setRefreshing(true); load(); }

  async function markAll() {
    await notificationsService.markAllRead();
    load();
  }

  async function markOne(id: string) {
    await notificationsService.markRead(id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((u) => Math.max(0, u - 1));
  }

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View style={[styles.header, { flexDirection }]}>
        <Text variant="h2" style={{ textAlign }}>{t('alerts')}</Text>
        {unread > 0 && (
          <Button label={t('confirm')} variant="ghost" size="sm" onPress={markAll} />
        )}
      </View>

      {loading ? (
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      ) : items.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="sm" muted style={{ textAlign }}>{t('noNearbyJobs')}</Text>
        </Card>
      ) : (
        items.map((n) => (
          <TouchableOpacity key={n.id} onPress={() => !n.isRead && markOne(n.id)} activeOpacity={0.8}>
            <Card style={[styles.item, !n.isRead && styles.itemUnread]}>
              {!n.isRead && <View style={styles.dot} />}
              <View style={{ flex: 1 }}>
                <Text variant="sm" bold={!n.isRead} style={{ textAlign }}>{n.title}</Text>
                <Text variant="xs" muted style={{ textAlign }}>{n.body}</Text>
                <Text variant="xs" muted style={{ textAlign }}>
                  {formatRelativeTime(n.createdAt, i18n.language)}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  item: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
});
