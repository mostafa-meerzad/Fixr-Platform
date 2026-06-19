import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FixrLogo } from '../../components/ui/FixrLogo';
import { jobsService } from '../../services/jobs.service';
import { useAuthStore } from '../../stores/auth.store';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

const ACTIVE_STATUSES = ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];

function jobBadge(status: string): { variant: any; label: string } {
  if (status === 'COMPLETED') return { variant: 'done', label: status };
  if (ACTIVE_STATUSES.includes(status)) return { variant: 'active', label: status };
  return { variant: 'done', label: status };
}

export default function HomeownerHomeScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { user } = useAuthStore();

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await jobsService.list({ limit: 5 });
      const all = res.data?.data?.items ?? [];
      setActiveJobs(all.filter((j: any) => ACTIVE_STATUSES.includes(j.status)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() { setRefreshing(true); load(); }

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <FixrLogo size="sm" />
      </View>

      {/* Greeting */}
      <View style={styles.greet}>
        <Text variant="h2" style={{ textAlign }}>{t('goodMorning')}, {user?.name?.split(' ')[0]}</Text>
      </View>

      {/* Post job CTA */}
      <TouchableOpacity
        onPress={() => router.push('/(homeowner)/post/create')}
        activeOpacity={0.85}
      >
        <Card style={styles.postCard}>
          <Text variant="h3" style={{ textAlign }}>{t('postJob')}</Text>
          <Text variant="sm" muted style={{ textAlign }}>{t('jobDescription')}</Text>
          <View style={styles.postBtn}>
            <Text variant="sm" color={Colors.primary} bold>+ {t('postNewJob')}</Text>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { flexDirection }]}>
            <Text variant="h3" style={{ textAlign }}>{t('myJobs')}</Text>
            <TouchableOpacity onPress={() => router.push('/(homeowner)/jobs')}>
              <Text variant="sm" color={Colors.primary}>{t('seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {activeJobs.map((job) => {
            const { variant, label } = jobBadge(job.status);
            return (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push({ pathname: '/(homeowner)/job/[id]', params: { id: job.id } })}
              >
                <Card style={styles.jobCard}>
                  <View style={[styles.jobRow, { flexDirection }]}>
                    <Text variant="body" bold style={[{ flex: 1 }, { textAlign }]}>{job.title}</Text>
                    <Badge variant={variant} label={label.toLowerCase()} />
                  </View>
                  <View style={[styles.jobMeta, { flexDirection }]}>
                    <Text variant="xs" muted>{job.zone?.name}</Text>
                    <Text variant="xs" muted>{formatRelativeTime(job.createdAt, i18n.language)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  greet: { marginBottom: Spacing.xl },
  postCard: { gap: Spacing.sm, marginBottom: Spacing.xl },
  postBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  jobCard: { marginBottom: Spacing.sm, gap: Spacing.sm },
  jobRow: { alignItems: 'center', gap: Spacing.md },
  jobMeta: { justifyContent: 'space-between', alignItems: 'center' },
});
