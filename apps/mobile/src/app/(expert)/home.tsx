import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Switch, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FixrLogo } from '../../components/ui/FixrLogo';
import { StarRating } from '../../components/ui/StarRating';
import { jobsService } from '../../services/jobs.service';
import { useAuthStore } from '../../stores/auth.store';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';
import { formatRelativeTime } from '../../utils/format';

function greeting(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
}

export default function ExpertHomeScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { user } = useAuthStore();

  const [available, setAvailable] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [browseRes, profileRes] = await Promise.all([
        jobsService.browse({ limit: 5 }),
        // profile endpoint returns expert stats
        fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/experts/me`, {
          headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
        }).then((r) => r.json()),
      ]);
      setJobs(browseRes.data?.data?.items ?? []);
      setProfile(profileRes?.data ?? null);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <FixrLogo size="sm" />
        <View style={styles.creditBadge}>
          <Text variant="xs" color={Colors.primary} bold>
            {profile?.creditBalance ?? 0} {t('credits')}
          </Text>
        </View>
      </View>

      {/* Greeting + availability */}
      <View style={styles.greetRow}>
        <View style={{ flex: 1 }}>
          <Text variant="h2" style={{ textAlign }}>
            {t(greeting())}, {user?.name?.split(' ')[0]}
          </Text>
          {!isVerified && (
            <View style={[styles.verificationBanner, { flexDirection }]}>
              <Text variant="xs" color={Colors.warning} style={{ flex: 1 }}>
                {t('verificationRequired')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(expert)/profile')}>
                <Text variant="xs" color={Colors.primary}>{t('submitDocuments')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Availability toggle */}
      <Card style={styles.availabilityCard}>
        <View style={[styles.availabilityRow, { flexDirection }]}>
          <View style={{ flex: 1 }}>
            <Text variant="body" bold>{t('availableForJobs')}</Text>
            {available && (
              <Text variant="xs" muted>{t('youllReceiveAlerts')}</Text>
            )}
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
      </Card>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatBox label={t('jobsCompleted')} value={profile?.completedJobs ?? 0} />
        <StatBox
          label={t('rating')}
          value={profile?.avgRating ? profile.avgRating.toFixed(1) : '—'}
          highlight
        />
        <StatBox
          label={t('completionRate')}
          value={profile?.completionRate ? `${Math.round(profile.completionRate * 100)}%` : '—'}
        />
        <StatBox label={t('noShowCount')} value={profile?.noShowCount ?? 0} />
      </View>

      {/* Nearby jobs */}
      <View style={[styles.sectionHeader, { flexDirection }]}>
        <Text variant="h3" style={{ textAlign }}>{t('nearbyJobs')}</Text>
        <TouchableOpacity onPress={() => router.push('/(expert)/browse')}>
          <Text variant="sm" color={Colors.primary}>{t('seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      ) : jobs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text variant="sm" muted style={{ textAlign }}>{t('noNearbyJobs')}</Text>
        </Card>
      ) : (
        jobs.map((job) => (
          <NearbyJobCard key={job.id} job={job} t={t} i18n={i18n} />
        ))
      )}
    </ScreenWrapper>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text variant="h3" color={highlight ? Colors.primary : Colors.textPrimary}>
        {String(value)}
      </Text>
      <Text variant="xs" muted>{label}</Text>
    </View>
  );
}

function NearbyJobCard({ job, t, i18n }: { job: any; t: any; i18n: any }) {
  const { textAlign, flexDirection } = useRTL();
  const urgencyVariant = job.urgency === 'EMERGENCY' ? 'emergency' : job.urgency === 'TODAY' ? 'today' : 'active';

  return (
    <TouchableOpacity onPress={() => router.push({ pathname: '/(expert)/job/[id]', params: { id: job.id } })}>
      <Card style={styles.jobCard}>
        <View style={[styles.jobCardTop, { flexDirection }]}>
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <Text variant="body" bold style={{ textAlign }}>{job.title}</Text>
            <Text variant="sm" muted style={{ textAlign }}>{job.zone?.name}</Text>
          </View>
          <Badge variant={urgencyVariant} label={t(job.urgency.toLowerCase())} />
        </View>

        <Text variant="sm" muted style={[styles.jobDesc, { textAlign }]} numberOfLines={2}>
          {job.description}
        </Text>

        <View style={[styles.jobCardBottom, { flexDirection }]}>
          <Text variant="xs" muted>
            {formatRelativeTime(job.createdAt, i18n.language)}
          </Text>
          <View style={[styles.bidBtn]}>
            <Text variant="sm" color={Colors.primary} bold>{t('placeBidNow')}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  creditBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
  },
  greetRow: {
    marginBottom: Spacing.lg,
  },
  verificationBanner: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderRadius: Radius.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  availabilityCard: {
    marginBottom: Spacing.lg,
  },
  availabilityRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  jobCard: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  jobCardTop: {
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  jobDesc: {
    lineHeight: 20,
  },
  jobCardBottom: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  bidBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});
