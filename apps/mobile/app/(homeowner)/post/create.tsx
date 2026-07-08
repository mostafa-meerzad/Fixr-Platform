import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { lookupService, type Category, type Zone } from '@/services/lookup.service';
import { jobsService } from '@/services/jobs.service';
import { usersService } from '@/services/users.service';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

type Step = 1 | 2 | 3 | 4;
type Urgency = 'EMERGENCY' | 'TODAY' | 'SCHEDULED';

// ─── UrgencyCard ──────────────────────────────────────────────────────────────

interface UrgencyCardProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function UrgencyCard({ icon, iconColor, iconBg, title, description, selected, onPress }: UrgencyCardProps) {
  return (
    <TouchableOpacity
      style={[styles.urgencyCard, selected && styles.urgencyCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.urgencyIconBox, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.urgencyTextBlock}>
        <Text style={styles.urgencyTitle}>{title}</Text>
        <Text style={styles.urgencyDesc}>{description}</Text>
      </View>
      {selected && (
        <MaterialIcons name={'check-circle' as any} size={22} color={Colors.primary600} />
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateJobScreen() {
  const { t } = useTranslation();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  // Step 1
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Step 2
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // Step 3
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');

  // Step 4
  const [selectedZone, setSelectedZone] = useState<{ id: string; nameEn: string } | null>(null);
  const [zoneError, setZoneError] = useState('');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    lookupService
      .categories()
      .then(({ data }) => setCategories(data))
      .catch(() => toast.show({ message: t('common.error'), variant: 'error' }))
      .finally(() => setCategoriesLoading(false));

    Promise.all([lookupService.zones(), usersService.getMe()])
      .then(([zonesRes, userRes]) => {
        setZones(zonesRes.data);
        const profile = userRes.data.homeownerProfile;
        if (profile?.zone) {
          setSelectedZone({ id: profile.zoneId, nameEn: profile.zone.nameEn });
        }
      })
      .catch(() => {})
      .finally(() => setZonesLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    } else {
      Alert.alert(
        t('homeowner.post.discardTitle'),
        t('homeowner.post.discardMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('homeowner.post.discardConfirm'), style: 'destructive', onPress: () => router.back() },
        ],
      );
    }
  }

  function handleCategorySelect(cat: Category) {
    setSelectedCategory(cat);
    setTimeout(() => setStep(2), 150);
  }

  function handleDetailsNext() {
    let hasError = false;
    if (title.trim().length < 3) {
      setTitleError(t('homeowner.post.titleErrorMin'));
      hasError = true;
    }
    if (description.trim().length < 20) {
      setDescriptionError(t('homeowner.post.descriptionErrorMin'));
      hasError = true;
    }
    if (!hasError) setStep(3);
  }

  function handleUrgencyNext() {
    if (!urgency) {
      toast.show({ message: t('homeowner.post.urgencyError'), variant: 'error' });
      return;
    }
    setStep(4);
  }

  async function handlePostJob() {
    let hasError = false;
    if (!selectedZone) {
      setZoneError(t('homeowner.post.zoneError'));
      hasError = true;
    }
    if (!address.trim()) {
      setAddressError(t('homeowner.post.addressError'));
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    try {
      const { data } = await jobsService.create({
        title: title.trim(),
        description: description.trim(),
        categoryId: selectedCategory!.id,
        zoneId: selectedZone!.id,
        address: address.trim(),
        urgency: urgency!,
        scheduledAt: urgency === 'SCHEDULED' && scheduledAt ? scheduledAt : undefined,
      });
      const jobId = (data as { id: string }).id;
      router.push(`/(homeowner)/post/media?jobId=${jobId}` as any);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? t('homeowner.post.errorNetwork');
      toast.show({ message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const headerRow = (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray600} />
      </TouchableOpacity>
      <Text style={styles.stepLabel}>
        {t('homeowner.post.stepLabel', { current: step, total: 6 })}
      </Text>
    </View>
  );

  // Build category rows of 2
  const categoryRows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    categoryRows.push(categories.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressBar currentStep={step} totalSteps={6} />

      {/* ── Step 1: Category ── */}
      {step === 1 && (
        <>
          <View style={styles.stepHeaderFixed}>
            {headerRow}
            <Text style={styles.pageTitle}>{t('homeowner.post.step1Title')}</Text>
          </View>

          {categoriesLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary600} size="large" />
            </View>
          ) : (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.categoryGrid}
              showsVerticalScrollIndicator={false}
            >
              {categoryRows.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.categoryRow}>
                  {row.map((cat) => {
                    const selected = selectedCategory?.id === cat.id;
                    console.log("cat: ", cat)
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                        onPress={() => handleCategorySelect(cat)}
                        activeOpacity={0.8}
                      >
                        {selected && (
                          <View style={styles.categoryCheckBadge}>
                            <MaterialIcons name="check" size={12} color={Colors.white} />
                          </View>
                        )}
                        <View style={[styles.categoryIconBox, selected && styles.categoryIconBoxSelected]}>
                          <MaterialIcons
                            name={cat.icon as any}
                            size={24}
                            color={selected ? Colors.primary600 : Colors.gray400}
                          />
                        </View>
                        <Text style={[styles.categoryName, selected && styles.categoryNameSelected]}>
                          {cat.nameEn ?? cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Pad row if only 1 item */}
                  {row.length === 1 && <View style={styles.categoryCardPlaceholder} />}
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* ── Step 2: Details ── */}
      {step === 2 && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.stepContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {headerRow}
            <Text style={styles.pageTitle}>{t('homeowner.post.step2Title')}</Text>

            <View style={styles.fields}>
              <Input
                label={t('homeowner.post.titleLabel')}
                placeholder={t('homeowner.post.titlePlaceholder')}
                value={title}
                onChangeText={(v) => { setTitle(v); if (titleError) setTitleError(''); }}
                error={titleError}
                onBlur={() => {
                  if (title.trim() && title.trim().length < 3)
                    setTitleError(t('homeowner.post.titleErrorMin'));
                }}
                autoCapitalize="sentences"
              />

              <View>
                <Input
                  label={t('homeowner.post.descriptionLabel')}
                  placeholder={t('homeowner.post.descriptionPlaceholder')}
                  value={description}
                  onChangeText={(v) => { setDescription(v); if (descriptionError) setDescriptionError(''); }}
                  error={descriptionError}
                  multiline
                  maxLength={500}
                  onBlur={() => {
                    if (description.trim() && description.trim().length < 20)
                      setDescriptionError(t('homeowner.post.descriptionErrorMin'));
                  }}
                />
                <Text style={styles.charCount}>
                  {description.length} / 500 {t('homeowner.post.chars')}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Button label={t('common.next')} onPress={handleDetailsNext} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Step 3: Urgency ── */}
      {step === 3 && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.stepContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {headerRow}
            <Text style={styles.pageTitle}>{t('homeowner.post.step3Title')}</Text>

            <View style={styles.urgencyCards}>
              <UrgencyCard
                icon={Icons.emergency}
                iconColor={Colors.danger600}
                iconBg={Colors.danger100}
                title={t('homeowner.post.urgencyEmergency')}
                description={t('homeowner.post.urgencyEmergencyDesc')}
                selected={urgency === 'EMERGENCY'}
                onPress={() => setUrgency('EMERGENCY')}
              />
              <UrgencyCard
                icon={Icons.today}
                iconColor={Colors.warning600}
                iconBg={Colors.warning100}
                title={t('homeowner.post.urgencyToday')}
                description={t('homeowner.post.urgencyTodayDesc')}
                selected={urgency === 'TODAY'}
                onPress={() => setUrgency('TODAY')}
              />
              <UrgencyCard
                icon={Icons.scheduled}
                iconColor={Colors.gray400}
                iconBg={Colors.gray100}
                title={t('homeowner.post.urgencyScheduled')}
                description={t('homeowner.post.urgencyScheduledDesc')}
                selected={urgency === 'SCHEDULED'}
                onPress={() => setUrgency('SCHEDULED')}
              />
              {urgency === 'SCHEDULED' && (
                <Input
                  label={t('homeowner.post.scheduledDateLabel')}
                  placeholder={t('homeowner.post.scheduledDatePlaceholder')}
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                  keyboardType="numbers-and-punctuation"
                  ltrText
                />
              )}
            </View>

            <View style={styles.footer}>
              <Button
                label={t('common.next')}
                onPress={handleUrgencyNext}
                disabled={!urgency}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Step 4: Location ── */}
      {step === 4 && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.stepContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {headerRow}
            <Text style={styles.pageTitle}>{t('homeowner.post.step4Title')}</Text>
            <Text style={styles.stepCaption}>{t('homeowner.post.step4Caption')}</Text>

            <View style={styles.fields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('homeowner.post.zoneLabel')}</Text>
                <TouchableOpacity
                  style={[styles.zoneSelector, zoneError ? styles.zoneSelectorError : null]}
                  onPress={() => setZonePickerVisible(true)}
                  disabled={zonesLoading}
                >
                  {zonesLoading ? (
                    <ActivityIndicator size="small" color={Colors.gray400} />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.zoneSelectorText,
                          !selectedZone && styles.zoneSelectorPlaceholder,
                        ]}
                      >
                        {selectedZone?.nameEn ?? t('homeowner.post.zonePlaceholder')}
                      </Text>
                      <MaterialIcons name={Icons.chevronDown as any} size={20} color={Colors.gray400} />
                    </>
                  )}
                </TouchableOpacity>
                {zoneError ? <Text style={styles.fieldError}>{zoneError}</Text> : null}
              </View>

              <Input
                label={t('homeowner.post.addressLabel')}
                placeholder={t('homeowner.post.addressPlaceholder')}
                value={address}
                onChangeText={(v) => { setAddress(v); if (addressError) setAddressError(''); }}
                error={addressError}
                multiline
                onBlur={() => {
                  if (!address.trim()) setAddressError(t('homeowner.post.addressError'));
                }}
              />

              <View style={styles.phoneInfoBox}>
                <MaterialIcons name={Icons.info as any} size={16} color={Colors.primary600} />
                <Text style={styles.phoneInfoText}>{t('homeowner.post.phoneCaption')}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Button
                label={t('homeowner.post.postJobBtn')}
                onPress={handlePostJob}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Zone picker modal ── */}
      <Modal
        visible={zonePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setZonePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setZonePickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('homeowner.post.selectZoneTitle')}</Text>
            <FlatList
              data={zones}
              keyExtractor={(z) => z.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.zoneRow}
                  onPress={() => {
                    setSelectedZone({ id: item.id, nameEn: item.nameEn ?? item.name });
                    setZoneError('');
                    setZonePickerVisible(false);
                  }}
                >
                  <Text style={styles.zoneRowText}>{item.nameEn ?? item.name}</Text>
                  {selectedZone?.id === item.id && (
                    <MaterialIcons name="check" size={20} color={Colors.primary600} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.zoneDivider} />}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Step header (fixed, used in step 1)
  stepHeaderFixed: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s2,
    paddingBottom: Spacing.s3,
    backgroundColor: Colors.bgApp,
  },

  // Back button row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    marginTop: Spacing.s2,
    marginBottom: Spacing.s4,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
  },

  // Page title
  pageTitle: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s2,
  },
  stepCaption: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    marginBottom: Spacing.s4,
  },

  // Step container (scrollable, for steps 2-4)
  stepContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s6,
  },

  // ── Category grid ──
  categoryGrid: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s2,
    paddingBottom: Spacing.s6,
    gap: Spacing.s3,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.s3,
  },
  categoryCard: {
    flex: 1,
    height: 90,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary50,
  },
  categoryCardPlaceholder: {
    flex: 1,
  },
  categoryCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconBoxSelected: {
    backgroundColor: Colors.primary100,
  },
  categoryName: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500' as any,
    color: Colors.gray900,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: Colors.primary600,
  },

  // ── Fields ──
  fields: {
    gap: Spacing.s4,
    marginBottom: Spacing.s6,
  },
  charCount: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: 'right',
    marginTop: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.danger600,
  },

  // ── Urgency cards ──
  urgencyCards: {
    gap: Spacing.s3,
    marginBottom: Spacing.s6,
  },
  urgencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  urgencyCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary600,
  },
  urgencyIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyTextBlock: {
    flex: 1,
    gap: 2,
  },
  urgencyTitle: {
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight as any,
    color: Colors.gray900,
  },
  urgencyDesc: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
  },

  // ── Zone selector ──
  zoneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    height: 52,
    paddingHorizontal: Spacing.s4,
  },
  zoneSelectorError: {
    borderColor: Colors.danger600,
  },
  zoneSelectorText: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray900,
  },
  zoneSelectorPlaceholder: {
    color: Colors.gray400,
  },

  // ── Phone info box ──
  phoneInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    backgroundColor: Colors.primary50,
    borderRadius: Radius.sm,
    padding: Spacing.s3,
  },
  phoneInfoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 18,
  },

  // ── Footer ──
  footer: {
    marginTop: 'auto' as any,
  },

  // ── Zone picker modal ──
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s8,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 32,
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  sheetTitle: {
    fontSize: Typography.heading2.fontSize,
    fontWeight: Typography.heading2.fontWeight as any,
    color: Colors.gray900,
    marginBottom: Spacing.s4,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s4,
    justifyContent: 'space-between',
  },
  zoneRowText: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },
  zoneDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
});
