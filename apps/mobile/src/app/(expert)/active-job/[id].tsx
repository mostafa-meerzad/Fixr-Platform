import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Divider } from '../../../components/ui/Divider';
import { jobsService } from '../../../services/jobs.service';
import { Colors, Spacing, Radius } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';

const STATUS_ORDER = [
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETION_REQUESTED',
  'COMPLETED',
];

export default function ActiveJobScreen() {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await jobsService.get(id);
      setJob(res.data?.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function transition(action: () => Promise<any>) {
    setTransitioning(true);
    try {
      await action();
      await load();
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message ?? t('error'));
    } finally {
      setTransitioning(false);
    }
  }

  if (loading || !job) {
    return (
      <ScreenWrapper scroll={false}>
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      </ScreenWrapper>
    );
  }

  const status: string = job.status;
  const homeowner = job.homeowner;
  const isCompleted = status === 'COMPLETED';
  const isWaiting = status === 'COMPLETION_REQUESTED';

  return (
    <ScreenWrapper scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
      </TouchableOpacity>

      <Text variant="h2" style={{ textAlign }}>{t('activeJob')}</Text>

      {/* Progress steps */}
      <View style={styles.steps}>
        {STATUS_ORDER.map((s, i) => {
          const idx = STATUS_ORDER.indexOf(status);
          const done = i < idx;
          const active = i === idx;
          return (
            <View key={s} style={[styles.stepRow, { flexDirection }]}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]} />
              {i < STATUS_ORDER.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
            </View>
          );
        })}
      </View>

      {/* Job info */}
      <Card style={styles.card}>
        <Text variant="h3" style={{ textAlign }}>{job.title}</Text>
        <Text variant="xs" muted style={{ textAlign }}>{job.zone?.name}</Text>
        <Divider />
        <View style={[styles.row, { flexDirection }]}>
          <Text variant="label">{t('jobAddress')}</Text>
          <Text variant="sm" style={{ flex: 1, textAlign }}>{job.address}</Text>
        </View>
        {job.notes && (
          <View style={[styles.row, { flexDirection }]}>
            <Text variant="label">{t('notes')}</Text>
            <Text variant="sm" style={{ flex: 1, textAlign }}>{job.notes}</Text>
          </View>
        )}
      </Card>

      {/* Homeowner info */}
      <Card style={styles.card}>
        <Text variant="label">{t('homeownerInfo')}</Text>
        <Text variant="body" bold style={{ textAlign }}>{homeowner?.name}</Text>
        <View style={[styles.actionRow, { flexDirection }]}>
          <Button
            label={t('callHomeowner')}
            variant="outline"
            size="sm"
            onPress={() => Linking.openURL(`tel:${homeowner?.phone}`)}
            style={{ flex: 1 }}
          />
          <Button
            label={t('openChat')}
            variant="outline"
            size="sm"
            onPress={() => router.push({ pathname: '/(shared)/chat/[jobId]', params: { jobId: id } })}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {/* Action button */}
      <View style={styles.actions}>
        {status === 'ASSIGNED' && (
          <Button
            label={t('iAmEnRoute')}
            onPress={() => transition(() => jobsService.markEnRoute(id))}
            loading={transitioning}
            fullWidth
          />
        )}
        {status === 'EN_ROUTE' && (
          <Button
            label={t('iHaveArrived')}
            onPress={() => transition(() => jobsService.markArrived(id))}
            loading={transitioning}
            fullWidth
          />
        )}
        {status === 'ARRIVED' && (
          <Button
            label={t('startJob')}
            onPress={() => transition(() => jobsService.markInProgress(id))}
            loading={transitioning}
            fullWidth
          />
        )}
        {status === 'IN_PROGRESS' && (
          <Button
            label={t('requestCompletion')}
            onPress={() => transition(() => jobsService.requestCompletion(id))}
            loading={transitioning}
            fullWidth
          />
        )}
        {isWaiting && (
          <Card style={styles.waitingCard}>
            <Text variant="sm" muted style={{ textAlign }}>{t('waitingConfirmation')}</Text>
          </Card>
        )}
        {isCompleted && (
          <Card style={styles.waitingCard}>
            <Text variant="sm" color={Colors.primary} bold style={{ textAlign }}>
              {t('jobCompleted')}
            </Text>
          </Card>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  stepRow: { flex: 1, alignItems: 'center' },
  stepDot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  stepDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border },
  stepLineDone: { backgroundColor: Colors.primary },
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  row: { gap: Spacing.md, alignItems: 'flex-start' },
  actionRow: { gap: Spacing.sm, marginTop: Spacing.sm },
  actions: { marginTop: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
  waitingCard: { alignItems: 'center', paddingVertical: Spacing.lg },
});
