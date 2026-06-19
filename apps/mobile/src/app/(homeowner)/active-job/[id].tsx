import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Divider } from '../../../components/ui/Divider';
import { StarRating } from '../../../components/ui/StarRating';
import { jobsService } from '../../../services/jobs.service';
import { Colors, Spacing } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'assigned',
  EN_ROUTE: 'enRoute',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'inProgress',
  COMPLETION_REQUESTED: 'requestCompletion',
  COMPLETED: 'completed',
};

export default function HomeownerActiveJobScreen() {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await jobsService.get(id);
      setJob(res.data?.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleConfirmCompletion() {
    Alert.alert(t('confirmCompletion'), t('confirmCompletionDesc'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), onPress: async () => {
          setConfirming(true);
          try {
            await jobsService.confirmCompletion(id);
            await load();
            Alert.alert('', t('jobCompleted'), [
              {
                text: t('leaveReview'),
                onPress: () => router.push({ pathname: '/(shared)/review/[jobId]', params: { jobId: id } }),
              },
              { text: t('cancel'), onPress: () => router.replace('/(homeowner)/jobs') },
            ]);
          } catch (e: any) {
            Alert.alert(t('error'), e?.response?.data?.message ?? t('error'));
          } finally {
            setConfirming(false);
          }
        },
      },
    ]);
  }

  if (loading || !job) {
    return (
      <ScreenWrapper scroll={false}>
        <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
      </ScreenWrapper>
    );
  }

  const expert = job.acceptedBid?.expert?.user;
  const ep = job.acceptedBid?.expert;
  const status: string = job.status;
  const isCompletionRequested = status === 'COMPLETION_REQUESTED';
  const isCompleted = status === 'COMPLETED';

  return (
    <ScreenWrapper scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
      </TouchableOpacity>

      <Text variant="h2" style={{ textAlign }}>{t('activeJob')}</Text>

      {/* Status indicator */}
      <Card style={[styles.statusCard, isCompleted && styles.statusCardDone]}>
        <Text variant="label">{t('bidStatus')}</Text>
        <Text variant="h3" color={isCompleted ? Colors.primary : Colors.textPrimary}>
          {t(STATUS_LABEL[status] ?? status.toLowerCase())}
        </Text>
      </Card>

      {/* Job info */}
      <Card style={styles.card}>
        <Text variant="h3" style={{ textAlign }}>{job.title}</Text>
        <Text variant="xs" muted style={{ textAlign }}>{job.zone?.name}</Text>
        {job.address && (
          <>
            <Divider />
            <Text variant="sm" style={{ textAlign }}>{t('jobAddress')}: {job.address}</Text>
          </>
        )}
      </Card>

      {/* Expert info */}
      {expert && (
        <Card style={styles.card}>
          <Text variant="label">{t('homeownerInfo')}</Text>
          <Text variant="body" bold style={{ textAlign }}>{expert.name}</Text>
          {ep?.avgRating != null && <StarRating value={ep.avgRating} size={14} />}
          <View style={[styles.actionRow, { flexDirection }]}>
            <Button
              label={t('callHomeowner')}
              variant="outline"
              size="sm"
              onPress={() => Linking.openURL(`tel:${expert.phone}`)}
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
      )}

      {/* Confirm completion */}
      {isCompletionRequested && (
        <Button
          label={t('confirmCompletion')}
          onPress={handleConfirmCompletion}
          loading={confirming}
          fullWidth
          style={styles.confirmBtn}
        />
      )}

      {isCompleted && (
        <Button
          label={t('leaveReview')}
          onPress={() => router.push({ pathname: '/(shared)/review/[jobId]', params: { jobId: id } })}
          variant="outline"
          fullWidth
          style={styles.confirmBtn}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  statusCard: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  statusCardDone: { borderLeftColor: Colors.primary },
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  actionRow: { gap: Spacing.sm, marginTop: Spacing.sm },
  confirmBtn: { marginTop: Spacing.lg, marginBottom: Spacing.xxxl },
});
