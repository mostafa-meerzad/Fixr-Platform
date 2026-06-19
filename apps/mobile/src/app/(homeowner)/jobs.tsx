import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { jobsService } from '../../services/jobs.service';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

const TABS = ['ALL', 'DRAFT', 'OPEN', 'ASSIGNED', 'COMPLETED'] as const;
type Tab = typeof TABS[number];

function badgeVariant(status: string): any {
  if (status === 'COMPLETED') return 'done';
  if (status === 'DRAFT') return 'bidSent';
  if (status === 'OPEN') return 'today';
  return 'active';
}

export default function HomeownerJobsScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const [jobs, setJobs] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (tab !== 'ALL') params.status = tab;
      const res = await jobsService.list(params);
      setJobs(res.data?.data?.items ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  function onRefresh() { setRefreshing(true); load(); }

  function tabLabel(t2: Tab) {
    const map: Record<Tab, string> = {
      ALL: t('myJobs'),
      DRAFT: t('draft'),
      OPEN: t('open'),
      ASSIGNED: t('assigned'),
      COMPLETED: t('completed'),
    };
    return map[t2];
  }

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View style={[styles.titleRow, { flexDirection }]}>
        <Text variant="h2" style={{ textAlign }}>{t('myJobs')}</Text>
        <Button
          label={`+ ${t('postJob')}`}
          size="sm"
          onPress={() => router.push('/(homeowner)/post/create')}
        />
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((tb) => (
          <TouchableOpacity
            key={tb}
            onPress={() => setTab(tb)}
            style={[styles.tabChip, tab === tb && styles.tabChipActive]}
          >
            <Text variant="xs" color={tab === tb ? Colors.primary : Colors.textSecondary} bold={tab === tb}>
              {tabLabel(tb)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      ) : jobs.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="sm" muted style={{ textAlign }}>{t('noJobs')}</Text>
        </Card>
      ) : (
        jobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            onPress={() => router.push({ pathname: '/(homeowner)/job/[id]', params: { id: job.id } })}
          >
            <Card style={styles.jobCard}>
              <View style={[styles.jobRow, { flexDirection }]}>
                <Text variant="body" bold style={[{ flex: 1 }, { textAlign }]}>{job.title}</Text>
                <Badge variant={badgeVariant(job.status)} label={t(job.status.toLowerCase())} />
              </View>
              <View style={[styles.meta, { flexDirection }]}>
                <Text variant="xs" muted>{job.zone?.name}</Text>
                <Text variant="xs" muted>{formatRelativeTime(job.createdAt, i18n.language)}</Text>
              </View>
              {job._count?.bids > 0 && (
                <Text variant="xs" color={Colors.primary}>
                  {job._count.bids} {t('bidsReceived').toLowerCase()}
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  tabs: { flexGrow: 0, marginBottom: Spacing.lg },
  tabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    backgroundColor: Colors.bgCard,
  },
  tabChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  jobCard: { marginBottom: Spacing.sm, gap: Spacing.sm },
  jobRow: { alignItems: 'center', gap: Spacing.md },
  meta: { justifyContent: 'space-between', alignItems: 'center' },
});
