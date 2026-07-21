import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { mediaService } from '@/services/media.service';
import { lookupService, type Zone } from '@/services/lookup.service';
import { usersService } from '@/services/users.service';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useAuthStore } from '@/stores/auth.store';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

export default function BusinessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const updateUser = useAuthStore((s) => s.updateUser);

  const {
    selfieUri, selfieMime,
    tazkiraFrontUri, tazkiraFrontMime,
    tazkiraBackUri, tazkiraBackMime,
    clear: clearOnboarding,
  } = useOnboardingStore();

  const [shopName, setShopName] = useState('');
  const [shopNameError, setShopNameError] = useState('');
  const [description, setDescription] = useState('');
  const [selectedZone, setSelectedZone] = useState<{ id: string; nameEn: string } | null>(null);
  const [zoneError, setZoneError] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopAddressError, setShopAddressError] = useState('');

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);

  const [shopPhotoUri, setShopPhotoUri] = useState<string | null>(null);
  const [shopPhotoMime, setShopPhotoMime] = useState<string | undefined>(undefined);
  const [shopPhotoPickerVisible, setShopPhotoPickerVisible] = useState(false);

  const [licenseUri, setLicenseUri] = useState<string | null>(null);
  const [licenseMime, setLicenseMime] = useState<string | undefined>(undefined);
  const [licensePickerVisible, setLicensePickerVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    shopName.trim().length > 0 &&
    selectedZone !== null &&
    shopAddress.trim().length > 0 &&
    shopPhotoUri !== null &&
    licenseUri !== null &&
    Boolean(selfieUri) &&
    Boolean(tazkiraFrontUri) &&
    Boolean(tazkiraBackUri) &&
    !submitting;

  useEffect(() => {
    setZonesLoading(true);
    lookupService
      .zones()
      .then(({ data }) => setZones(data))
      .catch(() => toast.show({ message: t('common.error'), variant: 'error' }))
      .finally(() => setZonesLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pickWithCamera(
    setUri: (v: string | null) => void,
    setMime: (v: string | undefined) => void,
  ) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.show({ message: t('auth.onboarding.permissionDenied'), variant: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUri(asset.uri);
    setMime(asset.mimeType ?? undefined);
  }

  async function pickFromLibrary(
    setUri: (v: string | null) => void,
    setMime: (v: string | undefined) => void,
  ) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.show({ message: t('auth.onboarding.permissionDenied'), variant: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUri(asset.uri);
    setMime(asset.mimeType ?? undefined);
  }

  async function handleSubmit() {
    let hasError = false;
    if (!shopName.trim()) { setShopNameError(t('auth.onboarding.errorShopName')); hasError = true; }
    if (!selectedZone)    { setZoneError(t('auth.onboarding.errorShopZone'));     hasError = true; }
    if (!shopAddress.trim()) { setShopAddressError(t('auth.onboarding.errorShopAddress')); hasError = true; }
    if (hasError) return;

    if (!selfieUri || !tazkiraFrontUri || !tazkiraBackUri) {
      toast.show({ message: t('auth.onboarding.errorMissingUploads'), variant: 'error' });
      router.replace('/(auth)/expert-onboarding/selfie' as any);
      return;
    }

    setSubmitting(true);
    try {
      await mediaService.uploadExpert('selfie', selfieUri, selfieMime);
      await mediaService.uploadExpert('tazkira_front', tazkiraFrontUri, tazkiraFrontMime);
      await mediaService.uploadExpert('tazkira_back', tazkiraBackUri, tazkiraBackMime);
      await mediaService.uploadExpert('shop_image', shopPhotoUri!, shopPhotoMime);
      await mediaService.uploadExpert('work_license', licenseUri!, licenseMime);
      const { url } = await mediaService.uploadAvatar(selfieUri, selfieMime);
      await updateUser({ avatarUrl: url });
      await usersService.submitVerification({
        shopName: shopName.trim(),
        description: description.trim() || undefined,
        shopZoneId: selectedZone!.id,
        shopAddress: shopAddress.trim(),
      });
      clearOnboarding();
      router.replace('/(auth)/expert-onboarding/submitted' as any);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? t('auth.onboarding.errorNetwork');
      toast.show({ message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenWrapper scroll keyboardAvoiding>
      <StepIndicator total={4} current={4} />

      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.onboarding.businessTitle')}</Text>

        <View style={styles.fields}>
          {/* Shop name */}
          <Input
            label={t('auth.onboarding.shopNameLabel')}
            placeholder={t('auth.onboarding.shopNamePlaceholder')}
            value={shopName}
            onChangeText={(v) => { setShopName(v); setShopNameError(''); }}
            error={shopNameError}
            onBlur={() => {
              if (!shopName.trim()) setShopNameError(t('auth.onboarding.errorShopName'));
            }}
            autoCapitalize="words"
          />

          {/* Zone + Address — 2-column row */}
          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Text style={styles.fieldLabel}>{t('auth.onboarding.shopZoneLabel')}</Text>
              <TouchableOpacity
                style={[styles.zoneSelector, zoneError ? styles.zoneSelectorError : null]}
                onPress={() => setZonePickerVisible(true)}
                disabled={zonesLoading || submitting}
              >
                <Text
                  style={[
                    styles.zoneSelectorText,
                    !selectedZone && styles.zoneSelectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedZone?.nameEn ?? t('auth.onboarding.shopZonePlaceholder')}
                </Text>
                <MaterialIcons name={Icons.chevronDown as any} size={18} color={Colors.gray400} />
              </TouchableOpacity>
              {zoneError ? <Text style={styles.fieldError}>{zoneError}</Text> : null}
            </View>

            <View style={styles.colHalf}>
              <Input
                label={t('auth.onboarding.shopAddressLabel')}
                placeholder={t('auth.onboarding.shopAddressPlaceholder')}
                value={shopAddress}
                onChangeText={(v) => { setShopAddress(v); setShopAddressError(''); }}
                error={shopAddressError}
                onBlur={() => {
                  if (!shopAddress.trim()) setShopAddressError(t('auth.onboarding.errorShopAddress'));
                }}
              />
            </View>
          </View>

          {/* About (optional) */}
          <Input
            label={t('auth.onboarding.shopDescLabel')}
            placeholder={t('auth.onboarding.shopDescPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.textarea}
          />

          {/* Shop Photo + Work License — 2-column upload grid */}
          <View style={styles.twoCol}>
            <UploadSlot
              label={t('auth.onboarding.shopPhotoLabel')}
              uri={shopPhotoUri}
              disabled={submitting}
              onPress={() => setShopPhotoPickerVisible(true)}
              onRetake={() => { setShopPhotoUri(null); setShopPhotoMime(undefined); setShopPhotoPickerVisible(true); }}
            />
            <UploadSlot
              label={t('auth.onboarding.workLicenseLabel')}
              uri={licenseUri}
              disabled={submitting}
              onPress={() => setLicensePickerVisible(true)}
              onRetake={() => { setLicenseUri(null); setLicenseMime(undefined); setLicensePickerVisible(true); }}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={t('auth.onboarding.submit')}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />
        </View>
      </View>

      {/* Zone picker */}
      <Modal visible={zonePickerVisible} transparent animationType="slide" onRequestClose={() => setZonePickerVisible(false)}>
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setZonePickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('auth.onboarding.selectZoneTitle')}</Text>
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
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Shop photo source picker */}
      <SourcePickerModal
        visible={shopPhotoPickerVisible}
        onClose={() => setShopPhotoPickerVisible(false)}
        onCamera={() => { setShopPhotoPickerVisible(false); pickWithCamera(setShopPhotoUri, setShopPhotoMime); }}
        onGallery={() => { setShopPhotoPickerVisible(false); pickFromLibrary(setShopPhotoUri, setShopPhotoMime); }}
      />

      {/* Work license source picker */}
      <SourcePickerModal
        visible={licensePickerVisible}
        onClose={() => setLicensePickerVisible(false)}
        onCamera={() => { setLicensePickerVisible(false); pickWithCamera(setLicenseUri, setLicenseMime); }}
        onGallery={() => { setLicensePickerVisible(false); pickFromLibrary(setLicenseUri, setLicenseMime); }}
      />
    </ScreenWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={indicatorStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            indicatorStyles.segment,
            i < current ? indicatorStyles.segmentFilled : indicatorStyles.segmentEmpty,
          ]}
        />
      ))}
    </View>
  );
}

interface UploadSlotProps {
  label: string;
  uri: string | null;
  disabled?: boolean;
  onPress: () => void;
  onRetake: () => void;
}

function UploadSlot({ label, uri, disabled, onPress, onRetake }: UploadSlotProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.slotWrapper}>
      <Text style={styles.slotLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.slot, uri ? styles.slotDone : null]}
        onPress={uri ? undefined : onPress}
        disabled={uri !== null || disabled}
        activeOpacity={0.8}
      >
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.slotImage} />
            <View style={styles.checkBadge}>
              <MaterialIcons name="check" size={12} color={Colors.white} />
            </View>
          </>
        ) : (
          <View style={styles.slotIdle}>
            <MaterialIcons name={Icons.camera as any} size={IconSize.btn} color={Colors.gray400} />
            <Text style={styles.slotIdleLabel}>{t('auth.onboarding.cameraOrGallery')}</Text>
          </View>
        )}
      </TouchableOpacity>
      {uri && !disabled && (
        <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
          <Text style={styles.retakeBtnLabel}>{t('auth.onboarding.retake')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface SourcePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

function SourcePickerModal({ visible, onClose, onCamera, onGallery }: SourcePickerModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.actionSheet}>
          <View style={styles.sheetHandle} />
          <TouchableOpacity style={styles.actionRow} onPress={onCamera}>
            <MaterialIcons name={Icons.camera as any} size={IconSize.inline} color={Colors.gray900} />
            <Text style={styles.actionLabel}>{t('auth.onboarding.takePhoto')}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={onGallery}>
            <MaterialIcons name={Icons.image as any} size={IconSize.inline} color={Colors.gray900} />
            <Text style={styles.actionLabel}>{t('auth.onboarding.chooseFromGallery')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const indicatorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s2,
  },
  segment: { flex: 1, height: 4, borderRadius: Radius.full },
  segmentFilled: { backgroundColor: Colors.primary600 },
  segmentEmpty:  { backgroundColor: Colors.sand },
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s8,
  },
  title: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s6,
  },
  fields: {
    gap: Spacing.s4,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // 2-col layout
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.s3,
  },
  colHalf: {
    flex: 1,
    gap: 6,
  },

  // Zone selector
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.danger600,
  },
  zoneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    height: 52,
    paddingHorizontal: Spacing.s3,
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

  // Upload slots
  slotWrapper: {
    flex: 1,
    gap: 6,
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  slot: {
    height: 110,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.sand,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgApp,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDone: {
    borderStyle: 'solid',
    borderColor: Colors.success600,
    backgroundColor: Colors.white,
  },
  slotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.s2,
    right: Spacing.s2,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  slotIdle: {
    alignItems: 'center',
    gap: Spacing.s2,
  },
  slotIdleLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray400,
    textAlign: 'center',
  },
  retakeBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.s1,
  },
  retakeBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
  },

  footer: {
    marginTop: Spacing.s6,
  },

  // Modals
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
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
  actionSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s4,
    gap: Spacing.s3,
  },
  actionLabel: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },
});
