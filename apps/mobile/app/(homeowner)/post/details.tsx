import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { lookupService, type Zone } from '@/services/lookup.service';
import { usersService } from '@/services/users.service';
import { jobsService } from '@/services/jobs.service';
import { mediaService } from '@/services/media.service';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

type UrgencyChip = 'EMERGENCY' | 'TODAY' | 'FLEXIBLE' | 'PICK_DATE';

interface LocalPhoto {
  uri: string;
  mimeType: string;
  key: string;
}

const URGENCY_CHIPS: { id: UrgencyChip; labelKey: string; icon: string }[] = [
  { id: 'EMERGENCY', labelKey: 'homeowner.post.urgencyEmergency', icon: Icons.emergency },
  { id: 'TODAY',     labelKey: 'homeowner.post.urgencyToday',     icon: Icons.today     },
  { id: 'FLEXIBLE',  labelKey: 'homeowner.post.detailsUrgencyFlexible', icon: Icons.scheduled },
  { id: 'PICK_DATE', labelKey: 'homeowner.post.detailsUrgencyPickDate', icon: 'event' },
];

export default function DetailsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  // Description
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // Urgency
  const [urgencyChip, setUrgencyChip] = useState<UrgencyChip | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  // Location
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<{ id: string; nameEn: string } | null>(null);
  const [zoneError, setZoneError] = useState('');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [zonePickerVisible, setZonePickerVisible] = useState(false);

  // Photos / video
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [video, setVideo] = useState<LocalPhoto | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);

  useEffect(() => {
    Promise.all([lookupService.zones(), usersService.getMe()])
      .then(([zonesRes, userRes]) => {
        setZones(zonesRes.data);
        const profile = (userRes.data as any).homeownerProfile;
        if (profile?.zone) {
          setSelectedZone({ id: profile.zoneId, nameEn: profile.zone.nameEn });
        }
        if (profile?.address) {
          setAddress(profile.address);
        }
      })
      .catch(() => {})
      .finally(() => setZonesLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    setDiscardVisible(true);
  }

  async function handleAddPhoto() {
    if (photos.length >= 3) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotos(prev => [
      ...prev,
      { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', key: `${Date.now()}` },
    ]);
  }

  function handleRemovePhoto(key: string) {
    setPhotos(prev => prev.filter(p => p.key !== key));
  }

  async function handleAddVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 120,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setVideo({ uri: asset.uri, mimeType: 'video/mp4', key: `${Date.now()}` });
  }

  async function handleSubmit() {
    let hasError = false;

    if (description.trim().length < 20) {
      setDescriptionError(t('homeowner.post.descriptionErrorMin'));
      hasError = true;
    }
    if (!urgencyChip) {
      toast.show({ message: t('homeowner.post.urgencyError'), variant: 'error' });
      hasError = true;
    }
    if (!selectedZone) {
      setZoneError(t('homeowner.post.zoneError'));
      hasError = true;
    }
    if (!address.trim()) {
      setAddressError(t('homeowner.post.addressError'));
      hasError = true;
    }
    if (hasError) return;

    const apiUrgency: 'EMERGENCY' | 'TODAY' | 'SCHEDULED' =
      urgencyChip === 'EMERGENCY' ? 'EMERGENCY'
      : urgencyChip === 'TODAY' ? 'TODAY'
      : 'SCHEDULED';

    const apiScheduledAt =
      urgencyChip === 'PICK_DATE' && scheduledDate.trim()
        ? `${scheduledDate.trim()}T${scheduledTime || '09:00'}:00.000Z`
        : undefined;

    setSubmitting(true);
    try {
      const { data } = await jobsService.create({
        title: categoryName,
        description: description.trim(),
        categoryId,
        zoneId: selectedZone!.id,
        address: address.trim(),
        urgency: apiUrgency,
        scheduledAt: apiScheduledAt,
      });
      const jobId = (data as any).id;

      // Upload media in parallel — best effort
      await Promise.allSettled([
        ...photos.map(p => mediaService.uploadJobMedia(jobId, p.uri, p.mimeType)),
        video ? mediaService.uploadJobMedia(jobId, video.uri, video.mimeType) : null,
      ].filter(Boolean) as Promise<any>[]);

      router.push({ pathname: '/(homeowner)/post/review' as any, params: { jobId } });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? t('homeowner.post.errorNetwork');
      toast.show({ message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressBar currentStep={2} totalSteps={3} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('homeowner.post.newJobTitle')}</Text>
        <Text style={styles.stepLabel}>
          {t('homeowner.post.stepLabel', { current: 2, total: 3 })}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section: Describe the problem ── */}
          <Text style={styles.sectionLabel}>{t('homeowner.post.detailsDescLabel')}</Text>
          <View style={[styles.textareaWrapper, descriptionError ? styles.textareaError : null]}>
            <TextInput
              style={styles.textarea}
              placeholder={t('homeowner.post.detailsDescPlaceholder')}
              placeholderTextColor={Colors.gray400}
              value={description}
              onChangeText={(v) => { setDescription(v); if (descriptionError) setDescriptionError(''); }}
              multiline
              maxLength={500}
              textAlignVertical="top"
              onBlur={() => {
                if (description.trim() && description.trim().length < 20)
                  setDescriptionError(t('homeowner.post.descriptionErrorMin'));
              }}
            />
          </View>
          {descriptionError ? (
            <Text style={styles.fieldError}>{descriptionError}</Text>
          ) : null}
          <Text style={styles.charCount}>{description.length} / 500</Text>

          {/* ── Section: When do you need it? ── */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            {t('homeowner.post.detailsUrgencyLabel')}
          </Text>
          <View style={styles.chipRow}>
            {URGENCY_CHIPS.map((chip) => {
              const active = urgencyChip === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setUrgencyChip(chip.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(chip.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {urgencyChip === 'PICK_DATE' && (
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Input
                  label={t('homeowner.post.detailsDatePlaceholder')}
                  placeholder="2026-08-01"
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  keyboardType="numbers-and-punctuation"
                  ltrText
                />
              </View>
              <View style={styles.dateField}>
                <Input
                  label={t('homeowner.post.detailsTimePlaceholder')}
                  placeholder="09:00"
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  keyboardType="numbers-and-punctuation"
                  ltrText
                />
              </View>
            </View>
          )}

          {/* ── Section: Location ── */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            {t('homeowner.post.detailsLocationLabel')}
          </Text>

          <TouchableOpacity
            style={[styles.zoneRow, zoneError ? styles.zoneRowError : null]}
            onPress={() => setZonePickerVisible(true)}
            disabled={zonesLoading}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={Icons.location as any} size={18} color={Colors.gray400} />
            {zonesLoading ? (
              <ActivityIndicator size="small" color={Colors.gray400} style={styles.flex} />
            ) : (
              <Text style={[styles.zoneText, !selectedZone && styles.zoneTextPlaceholder]}>
                {selectedZone
                  ? `${selectedZone.nameEn}, Kabul`
                  : t('homeowner.post.zonePlaceholder')}
              </Text>
            )}
            <Text style={styles.changeLink}>{t('homeowner.post.detailsChangeZone')}</Text>
          </TouchableOpacity>
          {zoneError ? <Text style={styles.fieldError}>{zoneError}</Text> : null}

          <View style={styles.addressWrapper}>
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
          </View>

          {/* ── Section: Add photos ── */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            {t('homeowner.post.photosLabel')}
          </Text>

          <View style={styles.photoRow}>
            {[0, 1, 2].map((i) => {
              const photo = photos[i];
              const isNextSlot = i === photos.length;

              if (photo) {
                return (
                  <View key={i} style={styles.photoSlot}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemovePhoto(photo.key)}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <MaterialCommunityIcons name="cancel" size={22} color={Colors.danger600} />
                    </TouchableOpacity>
                  </View>
                );
              }

              if (isNextSlot) {
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.photoSlot, styles.photoSlotEmpty]}
                    onPress={handleAddPhoto}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="plus" size={24} color={Colors.gray400} />
                    <Text style={styles.addPhotoLabel}>{t('homeowner.post.detailsAddPhoto')}</Text>
                  </TouchableOpacity>
                );
              }

              return <View key={i} style={[styles.photoSlot, styles.photoSlotGhost]} />;
            })}
          </View>

          {/* Video slot */}
          {video ? (
            <View style={styles.videoFilled}>
              <MaterialCommunityIcons name={Icons.video as any} size={20} color={Colors.primary600} />
              <Text style={styles.videoFilledText}>{t('homeowner.post.videoLabel')}</Text>
              <TouchableOpacity
                onPress={() => setVideo(null)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <MaterialCommunityIcons name="cancel" size={20} color={Colors.danger600} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.videoRow}
              onPress={handleAddVideo}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name={Icons.video as any} size={18} color={Colors.gray400} />
              <Text style={styles.videoRowText}>{t('homeowner.post.detailsVideoHint')}</Text>
            </TouchableOpacity>
          )}

          {/* Draft hint */}
          <View style={styles.draftHint}>
            <MaterialCommunityIcons name={Icons.info as any} size={14} color={Colors.gray400} />
            <Text style={styles.draftHintText}>{t('homeowner.post.detailsDraftHint')}</Text>
          </View>

          {/* CTA */}
          <View style={styles.footer}>
            <Button
              label={submitting ? t('homeowner.post.detailsUploading') : t('homeowner.post.detailsCta')}
              onPress={handleSubmit}
              variant="dark"
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={discardVisible}
        title={t('homeowner.post.discardTitle')}
        message={t('homeowner.post.discardMessage')}
        confirmLabel={t('homeowner.post.discardConfirm')}
        cancelLabel={t('common.cancel')}
        confirmVariant="destructive"
        onConfirm={() => { setDiscardVisible(false); router.back(); }}
        onCancel={() => setDiscardVisible(false)}
      />

      {/* Zone picker modal */}
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
                  style={styles.zonePickerRow}
                  onPress={() => {
                    setSelectedZone({ id: item.id, nameEn: item.nameEn ?? item.name });
                    setZoneError('');
                    setZonePickerVisible(false);
                  }}
                >
                  <Text style={styles.zonePickerRowText}>{item.nameEn ?? item.name}</Text>
                  {selectedZone?.id === item.id && (
                    <MaterialCommunityIcons name="check" size={20} color={Colors.primary600} />
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  flex: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s2,
    gap: Spacing.s3,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.heading2.fontSize,
    fontWeight: Typography.heading2.fontWeight as any,
    color: Colors.gray900,
  },
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
  },

  // ── Scroll content ──
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s8,
  },

  // ── Section labels ──
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as any,
    color: Colors.primary600,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    marginBottom: Spacing.s2,
  },
  sectionLabelSpaced: {
    marginTop: Spacing.s6,
  },

  // ── Description textarea ──
  textareaWrapper: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    padding: Spacing.s4,
    minHeight: 120,
  },
  textareaError: {
    borderColor: Colors.danger600,
  },
  textarea: {
    fontSize: 15,
    color: Colors.gray900,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: 'right',
    marginTop: Spacing.s1,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.danger600,
    marginTop: Spacing.s1,
  },

  // ── Urgency chips ──
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary600,
    borderColor: Colors.primary600,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as any,
    color: Colors.gray600,
    textAlign: 'center',
  },
  chipTextActive: {
    color: Colors.white,
  },

  // ── Date / time row (PICK_DATE) ──
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.s3,
    marginTop: Spacing.s3,
  },
  dateField: {
    flex: 1,
  },

  // ── Zone row ──
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    height: 52,
    paddingHorizontal: Spacing.s4,
  },
  zoneRowError: {
    borderColor: Colors.danger600,
  },
  zoneText: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray900,
  },
  zoneTextPlaceholder: {
    color: Colors.gray400,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: '600' as any,
    color: Colors.primary600,
  },
  addressWrapper: {
    marginTop: Spacing.s3,
  },

  // ── Photo slots ──
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    marginBottom: Spacing.s3,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    position: 'relative',
    overflow: 'visible',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  photoSlotEmpty: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s1,
  },
  photoSlotGhost: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
    opacity: 0.4,
  },
  addPhotoLabel: {
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: '500' as any,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    zIndex: 1,
  },

  // ── Video row ──
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s4,
    marginBottom: Spacing.s3,
  },
  videoRowText: {
    fontSize: 13,
    color: Colors.gray400,
    fontWeight: '400' as any,
    flex: 1,
  },
  videoFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    height: 52,
    backgroundColor: Colors.primary50,
    borderWidth: 1.5,
    borderColor: Colors.primary100,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s4,
    marginBottom: Spacing.s3,
  },
  videoFilledText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary600,
    fontWeight: '500' as any,
  },

  // ── Draft hint ──
  draftHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
    marginBottom: Spacing.s6,
  },
  draftHintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.gray400,
    lineHeight: 18,
  },

  // ── Footer ──
  footer: {
    marginTop: Spacing.s2,
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
  zonePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s4,
    justifyContent: 'space-between',
  },
  zonePickerRowText: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },
  zoneDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
});
