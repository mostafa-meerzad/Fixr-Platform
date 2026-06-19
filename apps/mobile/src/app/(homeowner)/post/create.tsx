import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { jobsService } from '../../../services/jobs.service';
import { lookupService } from '../../../services/lookup.service';
import { Colors, Spacing, Radius } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';

type Urgency = 'EMERGENCY' | 'TODAY' | 'SCHEDULED';

const URGENCY_OPTIONS: Urgency[] = ['EMERGENCY', 'TODAY', 'SCHEDULED'];

export default function CreateJobScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [address, setAddress] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('TODAY');
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLookups() {
      const [catRes, zoneRes] = await Promise.all([
        lookupService.categories(),
        lookupService.zones(),
      ]);
      setCategories(catRes.data?.data ?? []);
      setZones(zoneRes.data?.data ?? []);
    }
    fetchLookups();
  }, []);

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = t('error');
    if (!description.trim()) errs.description = t('error');
    if (!categoryId) errs.category = t('error');
    if (!zoneId) errs.zone = t('error');
    if (!address.trim()) errs.address = t('error');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleNext() {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await jobsService.create({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        zoneId,
        address: address.trim(),
        urgency,
        notes: notes.trim() || undefined,
      });
      const jobId = res.data?.data?.id;
      router.push({ pathname: '/(homeowner)/post/review', params: { jobId } });
    } catch (e: any) {
      setErrors({ title: e?.response?.data?.message ?? t('error') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper scroll>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text variant="sm" color={Colors.primary}>{t('back')}</Text>
      </TouchableOpacity>

      <Text variant="h2" style={{ textAlign }}>{t('postJob')}</Text>
      <Text variant="xs" muted style={{ textAlign }}>{t('step1of3')}</Text>

      <View style={styles.form}>
        <Input
          label={t('jobTitle')}
          value={title}
          onChangeText={setTitle}
          error={errors.title}
          autoFocus
        />
        <Input
          label={t('jobDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
          error={errors.description}
        />

        {/* Category */}
        <View>
          <Text variant="label" style={{ textAlign }}>{t('jobCategory')}</Text>
          {errors.category && <Text variant="xs" color={Colors.danger}>{errors.category}</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
              >
                <Text variant="xs" color={categoryId === c.id ? Colors.primary : Colors.textSecondary}>
                  {i18n.language === 'fa' ? c.name : (c.nameEn ?? c.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Zone */}
        <View>
          <Text variant="label" style={{ textAlign }}>{t('jobZone')}</Text>
          {errors.zone && <Text variant="xs" color={Colors.danger}>{errors.zone}</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {zones.map((z) => (
              <TouchableOpacity
                key={z.id}
                onPress={() => setZoneId(z.id)}
                style={[styles.chip, zoneId === z.id && styles.chipActive]}
              >
                <Text variant="xs" color={zoneId === z.id ? Colors.primary : Colors.textSecondary}>
                  {i18n.language === 'fa' ? z.name : (z.nameEn ?? z.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Input
          label={t('jobAddress')}
          value={address}
          onChangeText={setAddress}
          error={errors.address}
        />

        {/* Urgency */}
        <View>
          <Text variant="label" style={{ textAlign }}>{t('jobUrgency')}</Text>
          <View style={[styles.urgencyRow, { flexDirection }]}>
            {URGENCY_OPTIONS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setUrgency(u)}
                style={[styles.urgencyBtn, urgency === u && styles.urgencyBtnActive]}
              >
                <Text
                  variant="sm"
                  bold={urgency === u}
                  color={urgency === u ? Colors.primary : Colors.textSecondary}
                >
                  {t(u.toLowerCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label={`${t('notes')} (${t('addNote')})`}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <Button
        label={t('next')}
        onPress={handleNext}
        loading={loading}
        fullWidth
        style={styles.btn}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { paddingBottom: Spacing.md },
  form: { marginTop: Spacing.lg, gap: Spacing.lg },
  chips: { flexGrow: 0, marginTop: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    backgroundColor: Colors.bgCard,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  urgencyRow: { gap: Spacing.sm, marginTop: Spacing.sm },
  urgencyBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
  },
  urgencyBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  btn: { marginTop: Spacing.xl, marginBottom: Spacing.xxxl },
});
