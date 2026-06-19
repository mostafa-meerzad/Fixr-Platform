import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { jobsService } from '../../services/jobs.service';
import { lookupService } from '../../services/lookup.service';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

export default function BrowseScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();

  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      const params: Record<string, string> = {};
      if (categoryId) params.categoryId = categoryId;
      if (zoneId) params.zoneId = zoneId;

      const [jobsRes, catRes, zoneRes] = await Promise.all([
        jobsService.browse(params),
        categories.length ? Promise.resolve(null) : lookupService.categories(),
        zones.length ? Promise.resolve(null) : lookupService.zones(),
      ]);

      setJobs(jobsRes.data?.data?.items ?? []);
      if (catRes) setCategories(catRes.data?.data ?? []);
      if (zoneRes) setZones(zoneRes.data?.data ?? []);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, zoneId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    load(true);
  }

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      <Text variant="h2" style={[styles.title, { textAlign }]}>{t('browseJobs')}</Text>

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        <FilterChip label={t('allCategories')} active={!categoryId} onPress={() => setCategoryId('')} />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={i18n.language === 'fa' ? c.name : (c.nameEn ?? c.name)}
            active={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}
          />
        ))}
      </ScrollView>

      {/* Zone filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        <FilterChip label={t('allZones')} active={!zoneId} onPress={() => setZoneId('')} />
        {zones.map((z) => (
          <FilterChip
            key={z.id}
            label={i18n.language === 'fa' ? z.name : (z.nameEn ?? z.name)}
            active={zoneId === z.id}
            onPress={() => setZoneId(zoneId === z.id ? '' : z.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.list}>
        {loading ? (
          <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
        ) : jobs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text variant="sm" muted style={{ textAlign }}>{t('noJobsFound')}</Text>
          </Card>
        ) : (
          jobs.map((job) => <BrowseJobCard key={job.id} job={job} t={t} i18n={i18n} />)
        )}
      </View>
    </ScreenWrapper>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text variant="xs" color={active ? Colors.primary : Colors.textSecondary} bold={active}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function BrowseJobCard({ job, t, i18n }: { job: any; t: any; i18n: any }) {
  const { textAlign, flexDirection } = useRTL();
  const urgencyVariant = job.urgency === 'EMERGENCY' ? 'emergency' : job.urgency === 'TODAY' ? 'today' : 'active';

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(expert)/job/[id]', params: { id: job.id } })}
      style={styles.jobTouchable}
    >
      <Card style={styles.jobCard}>
        <View style={[styles.jobTop, { flexDirection }]}>
          <View style={{ flex: 1 }}>
            <Text variant="body" bold style={{ textAlign }}>{job.title}</Text>
            <Text variant="xs" muted style={{ textAlign }}>{job.zone?.name} · {job.category?.name}</Text>
          </View>
          <Badge variant={urgencyVariant} label={t(job.urgency.toLowerCase())} />
        </View>

        <Text variant="sm" muted style={{ textAlign }} numberOfLines={2}>{job.description}</Text>

        <View style={[styles.jobBottom, { flexDirection }]}>
          <Text variant="xs" muted>{formatRelativeTime(job.createdAt, i18n.language)}</Text>
          <Text variant="xs" color={Colors.primary}>
            {job._count?.bids ?? 0} {t('placeBid').toLowerCase()}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: Spacing.lg },
  chips: { marginBottom: Spacing.sm, flexGrow: 0 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    backgroundColor: Colors.bgCard,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  list: { marginTop: Spacing.md, gap: Spacing.sm },
  jobTouchable: { marginBottom: Spacing.sm },
  jobCard: { gap: Spacing.sm },
  jobTop: { alignItems: 'flex-start', gap: Spacing.md },
  jobBottom: { justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl },
});
