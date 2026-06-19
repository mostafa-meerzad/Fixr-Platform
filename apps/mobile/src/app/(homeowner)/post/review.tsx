import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Divider } from '../../../components/ui/Divider';
import { jobsService } from '../../../services/jobs.service';
import { Colors, Spacing } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';

export default function ReviewJobScreen() {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    jobsService.get(jobId).then((res) => {
      setJob(res.data?.data);
      setLoading(false);
    });
  }, [jobId]);

  async function handlePublish() {
    setPublishing(true);
    try {
      await jobsService.publish(jobId);
      Alert.alert('', t('publishJob'), [
        { text: t('confirm'), onPress: () => router.replace('/(homeowner)/jobs') },
      ]);
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message ?? t('error'));
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    Alert.alert(t('deleteJob'), t('deleteJobConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), style: 'destructive', onPress: async () => {
          await jobsService.deleteDraft(jobId);
          router.replace('/(homeowner)/jobs');
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

  const urgencyVariant = job.urgency === 'EMERGENCY' ? 'emergency' : job.urgency === 'TODAY' ? 'today' : 'active';

  return (
    <ScreenWrapper scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
      </TouchableOpacity>

      <Text variant="h2" style={{ textAlign }}>{t('reviewAndPublish')}</Text>
      <Text variant="xs" muted style={{ textAlign }}>{t('step3of3')}</Text>

      <Card style={styles.card}>
        <View style={[styles.titleRow, { flexDirection }]}>
          <Text variant="h3" style={[{ flex: 1 }, { textAlign }]}>{job.title}</Text>
          <Badge variant={urgencyVariant} label={t(job.urgency.toLowerCase())} />
        </View>

        <Text variant="sm" style={{ textAlign }}>{job.description}</Text>

        <Divider />

        <Row label={t('jobCategory')} value={job.category?.name} flexDirection={flexDirection} textAlign={textAlign} />
        <Row label={t('jobZone')} value={job.zone?.name} flexDirection={flexDirection} textAlign={textAlign} />
        <Row label={t('jobAddress')} value={job.address} flexDirection={flexDirection} textAlign={textAlign} />
        {job.notes && <Row label={t('notes')} value={job.notes} flexDirection={flexDirection} textAlign={textAlign} />}
      </Card>

      <Button
        label={t('publishJob')}
        onPress={handlePublish}
        loading={publishing}
        fullWidth
        style={styles.btn}
      />
      <Button
        label={t('deleteJob')}
        onPress={handleDelete}
        variant="danger"
        fullWidth
        style={{ marginTop: Spacing.sm, marginBottom: Spacing.xxxl }}
      />
    </ScreenWrapper>
  );
}

function Row({ label, value, flexDirection, textAlign }: any) {
  return (
    <View style={[styles.row, { flexDirection }]}>
      <Text variant="label" style={{ minWidth: 80 }}>{label}</Text>
      <Text variant="sm" style={{ flex: 1, textAlign }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  card: { marginTop: Spacing.xl, gap: Spacing.md },
  titleRow: { alignItems: 'flex-start', gap: Spacing.md },
  row: { alignItems: 'flex-start', gap: Spacing.md },
  btn: { marginTop: Spacing.xl },
});
