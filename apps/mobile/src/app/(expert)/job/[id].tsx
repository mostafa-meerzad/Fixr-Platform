import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Divider } from '../../../components/ui/Divider';
import { jobsService } from '../../../services/jobs.service';
import { bidsService } from '../../../services/bids.service';
import { Colors, Spacing, Radius } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';
import { formatRelativeTime } from '../../../utils/format';

export default function ExpertJobDetailScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<any>(null);
  const [myBid, setMyBid] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // bid form state
  const [price, setPrice] = useState('');
  const [arrivalMin, setArrivalMin] = useState('');
  const [durationHrs, setDurationHrs] = useState('');
  const [warranty, setWarranty] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [jobRes, bidsRes] = await Promise.all([
          jobsService.get(id),
          bidsService.mine(),
        ]);
        const jobData = jobRes.data?.data;
        setJob(jobData);
        const existing = bidsRes.data?.data?.find((b: any) => b.jobId === id);
        setMyBid(existing ?? null);
        if (existing) {
          setPrice(String(existing.price));
          setArrivalMin(String(existing.estimatedArrivalMinutes));
          setDurationHrs(String(existing.estimatedDurationHours));
          setWarranty(existing.warrantyDescription ?? '');
          setMessage(existing.expertMessage ?? '');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!price || isNaN(Number(price)) || Number(price) <= 0) errs.price = t('error');
    if (!arrivalMin || isNaN(Number(arrivalMin))) errs.arrivalMin = t('error');
    if (!durationHrs || isNaN(Number(durationHrs))) errs.durationHrs = t('error');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleBid() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        price: Number(price),
        estimatedArrivalMinutes: Number(arrivalMin),
        estimatedDurationHours: Number(durationHrs),
        warrantyDescription: warranty || undefined,
        expertMessage: message || undefined,
      };
      if (myBid) {
        await bidsService.update(myBid.id, payload);
      } else {
        await bidsService.place(id, payload);
      }
      Alert.alert('', t('bidSent'), [{ text: t('confirm'), onPress: () => router.back() }]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? t('error');
      Alert.alert(t('error'), msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!myBid) return;
    Alert.alert(t('withdrawBid'), t('logoutConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), style: 'destructive', onPress: async () => {
          await bidsService.withdraw(myBid.id);
          router.back();
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenWrapper scroll>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
        </TouchableOpacity>

        {/* Job details */}
        <Card style={styles.jobCard}>
          <View style={[styles.titleRow, { flexDirection }]}>
            <Text variant="h3" style={[{ flex: 1 }, { textAlign }]}>{job.title}</Text>
            <Badge variant={urgencyVariant} label={t(job.urgency.toLowerCase())} />
          </View>
          <Text variant="xs" muted style={{ textAlign }}>{job.zone?.name} · {job.category?.name}</Text>
          <Divider />
          <Text variant="sm" style={{ textAlign }}>{job.description}</Text>
          {job.address && (
            <Text variant="xs" muted style={{ textAlign }}>{t('jobAddress')}: {job.address}</Text>
          )}
          {job.notes && (
            <Text variant="xs" muted style={{ textAlign }}>{t('notes')}: {job.notes}</Text>
          )}
          <Text variant="xs" muted style={{ textAlign }}>
            {formatRelativeTime(job.createdAt, i18n.language)}
          </Text>
        </Card>

        {/* Bid form */}
        <View style={styles.section}>
          <Text variant="h3" style={{ textAlign }}>{myBid ? t('placeBid') : t('placeBid')}</Text>
          <Text variant="xs" color={Colors.primary} style={{ textAlign }}>{t('creditCost')}</Text>
        </View>

        <Input
          label={t('bidPrice')}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          error={errors.price}
        />
        <Input
          label={t('estimatedArrival')}
          value={arrivalMin}
          onChangeText={setArrivalMin}
          keyboardType="numeric"
          error={errors.arrivalMin}
        />
        <Input
          label={t('estimatedDuration')}
          value={durationHrs}
          onChangeText={setDurationHrs}
          keyboardType="decimal-pad"
          error={errors.durationHrs}
        />
        <Input
          label={t('warranty')}
          value={warranty}
          onChangeText={setWarranty}
          multiline
        />
        <Input
          label={t('message')}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <View style={styles.actions}>
          <Button
            label={myBid ? t('confirm') : t('sendBid')}
            onPress={handleBid}
            loading={submitting}
            fullWidth
          />
          {myBid && (
            <Button
              label={t('withdrawBid')}
              onPress={handleWithdraw}
              variant="danger"
              fullWidth
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  jobCard: { gap: Spacing.sm, marginBottom: Spacing.xl },
  titleRow: { alignItems: 'flex-start', gap: Spacing.md },
  section: { marginBottom: Spacing.md, marginTop: Spacing.md, gap: Spacing.xs },
  actions: { marginTop: Spacing.xl, paddingBottom: Spacing.xxxl },
});
