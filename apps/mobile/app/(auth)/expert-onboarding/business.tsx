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
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { mediaService } from '@/services/media.service';
import { lookupService, type Zone } from '@/services/lookup.service';
import { usersService } from '@/services/users.service';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useAuthStore } from '@/stores/auth.store';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

interface CompactUploadCardProps {
  label: string;
  idleLabel: string;
  uri: string | null;
  onPress: () => void;
  onRetake: () => void;
  disabled?: boolean;
}

function CompactUploadCard({ label, idleLabel, uri, onPress, onRetake, disabled }: CompactUploadCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.uploadCardWrapper}>
      <Text style={styles.uploadCardLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.uploadCard, uri ? styles.uploadCardDone : null]}
        onPress={uri ? undefined : onPress}
        disabled={uri !== null || disabled}
        activeOpacity={0.75}
      >
        {uri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri }} style={styles.image} />
            <View style={styles.overlay}>
              <View style={styles.checkCircle}>
                <MaterialIcons name="check" size={20} color={Colors.white} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.idlePlaceholder}>
            <MaterialIcons name={Icons.image as any} size={28} color={Colors.primary600} />
            <Text style={styles.idleLabel}>{idleLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
      {uri !== null && !disabled && (
        <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
          <MaterialIcons name={Icons.camera as any} size={IconSize.status} color={Colors.primary600} />
          <Text style={styles.retakeBtnLabel}>{t('auth.onboarding.retake')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BusinessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const updateUser = useAuthStore((s) => s.updateUser);

  const {
    selfieUri,
    selfieMime,
    tazkiraFrontUri,
    tazkiraFrontMime,
    tazkiraBackUri,
    tazkiraBackMime,
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
    if (!shopName.trim()) {
      setShopNameError(t('auth.onboarding.errorShopName'));
      hasError = true;
    }
    if (!selectedZone) {
      setZoneError(t('auth.onboarding.errorShopZone'));
      hasError = true;
    }
    if (!shopAddress.trim()) {
      setShopAddressError(t('auth.onboarding.errorShopAddress'));
      hasError = true;
    }
    if (hasError) return;

    // Guard: if user somehow reached this screen without completing earlier steps
    if (!selfieUri || !tazkiraFrontUri || !tazkiraBackUri) {
      toast.show({ message: t('auth.onboarding.errorMissingUploads'), variant: 'error' });
      router.replace('/(auth)/expert-onboarding/selfie' as any);
      return;
    }

    setSubmitting(true);
    try {
      // Upload all 5 verification files then avatar — nothing hits the server before this point
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
      <ProgressBar currentStep={3} totalSteps={3} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.stepLabel}>
            {t('auth.onboarding.stepLabel', { current: 3, total: 3 })}
          </Text>
        </View>

        <Text style={styles.title}>{t('auth.onboarding.businessTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.businessSubtitle')}</Text>

        <View style={styles.fields}>
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

          <Input
            label={t('auth.onboarding.shopDescLabel')}
            placeholder={t('auth.onboarding.shopDescPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.textarea}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('auth.onboarding.shopZoneLabel')}</Text>
            <TouchableOpacity
              style={[styles.zoneSelector, zoneError ? styles.zoneSelectorError : null]}
              onPress={() => setZonePickerVisible(true)}
              disabled={zonesLoading || submitting}
            >
              {zonesLoading ? null : (
                <>
                  <Text
                    style={[
                      styles.zoneSelectorText,
                      !selectedZone && styles.zoneSelectorPlaceholder,
                    ]}
                  >
                    {selectedZone?.nameEn ?? t('auth.onboarding.shopZonePlaceholder')}
                  </Text>
                  <MaterialIcons name={Icons.chevronDown as any} size={20} color={Colors.gray400} />
                </>
              )}
            </TouchableOpacity>
            {zoneError ? <Text style={styles.fieldError}>{zoneError}</Text> : null}
          </View>

          <Input
            label={t('auth.onboarding.shopAddressLabel')}
            placeholder={t('auth.onboarding.shopAddressPlaceholder')}
            value={shopAddress}
            onChangeText={(v) => { setShopAddress(v); setShopAddressError(''); }}
            error={shopAddressError}
            onBlur={() => {
              if (!shopAddress.trim()) setShopAddressError(t('auth.onboarding.errorShopAddress'));
            }}
            multiline
          />

          <CompactUploadCard
            label={t('auth.onboarding.shopPhotoLabel')}
            idleLabel={t('auth.onboarding.addPhoto')}
            uri={shopPhotoUri}
            disabled={submitting}
            onPress={() => pickWithCamera(setShopPhotoUri, setShopPhotoMime)}
            onRetake={() => {
              setShopPhotoUri(null);
              setShopPhotoMime(undefined);
              pickWithCamera(setShopPhotoUri, setShopPhotoMime);
            }}
          />

          <CompactUploadCard
            label={t('auth.onboarding.workLicenseLabel')}
            idleLabel={t('auth.onboarding.addDocument')}
            uri={licenseUri}
            disabled={submitting}
            onPress={() => setLicensePickerVisible(true)}
            onRetake={() => {
              setLicenseUri(null);
              setLicenseMime(undefined);
              setLicensePickerVisible(true);
            }}
          />
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
              ItemSeparatorComponent={() => <View style={styles.zoneDivider} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Work license source picker */}
      <Modal
        visible={licensePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLicensePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setLicensePickerVisible(false)} />
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setLicensePickerVisible(false);
                pickWithCamera(setLicenseUri, setLicenseMime);
              }}
            >
              <MaterialIcons name={Icons.camera as any} size={IconSize.inline} color={Colors.gray900} />
              <Text style={styles.actionLabel}>{t('auth.onboarding.takePhoto')}</Text>
            </TouchableOpacity>
            <View style={styles.zoneDivider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setLicensePickerVisible(false);
                pickFromLibrary(setLicenseUri, setLicenseMime);
              }}
            >
              <MaterialIcons name={Icons.image as any} size={IconSize.inline} color={Colors.gray900} />
              <Text style={styles.actionLabel}>{t('auth.onboarding.chooseFromGallery')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s8,
  },
  headerRow: {
    marginTop: Spacing.s4,
    marginBottom: Spacing.s4,
  },
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
  },
  title: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s2,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    marginBottom: Spacing.s6,
  },
  fields: {
    gap: Spacing.s4,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
    fontWeight: '400',
    color: Colors.gray900,
  },
  zoneSelectorPlaceholder: {
    color: Colors.gray400,
  },

  // Compact upload card
  uploadCardWrapper: {
    gap: 6,
  },
  uploadCardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  uploadCard: {
    height: 120,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary600,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardDone: {
    borderStyle: 'solid',
    borderColor: Colors.success600,
    borderWidth: 2,
  },
  imageWrap: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idlePlaceholder: {
    alignItems: 'center',
    gap: Spacing.s2,
  },
  idleLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500' as any,
    color: Colors.primary600,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s1,
    paddingVertical: Spacing.s1,
  },
  retakeBtnLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.primary600,
  },

  footer: {
    marginTop: Spacing.s6,
  },

  // Zone picker modal
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

  // License source action sheet
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
