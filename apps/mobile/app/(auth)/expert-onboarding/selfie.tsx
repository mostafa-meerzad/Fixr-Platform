import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { mediaService } from '@/services/media.service';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export default function SelfieScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mime, setMime] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<UploadStatus>('idle');

  async function pickAndUpload() {
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
    setImageUri(asset.uri);
    setMime(asset.mimeType ?? undefined);
    await doUpload(asset.uri, asset.mimeType ?? undefined);
  }

  async function doUpload(uri: string, mimeType?: string) {
    setStatus('uploading');
    try {
      await mediaService.uploadExpert('selfie', uri, mimeType);
      setStatus('done');
    } catch {
      setStatus('error');
      toast.show({ message: t('auth.onboarding.uploadError'), variant: 'error' });
    }
  }

  function handleZonePress() {
    if (status === 'idle') {
      pickAndUpload();
    } else if (status === 'error' && imageUri) {
      doUpload(imageUri, mime);
    }
  }

  async function handleRetake() {
    setImageUri(null);
    setMime(undefined);
    setStatus('idle');
    await pickAndUpload();
  }

  const zoneDisabled = status === 'uploading' || status === 'done';

  return (
    <ScreenWrapper>
      <ProgressBar currentStep={1} totalSteps={3} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.stepLabel}>
            {t('auth.onboarding.stepLabel', { current: 1, total: 3 })}
          </Text>
        </View>

        <Text style={styles.title}>{t('auth.onboarding.selfieTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.selfieSubtitle')}</Text>

        {/* Upload zone */}
        <TouchableOpacity
          style={[
            styles.uploadZone,
            status === 'done' && styles.uploadZoneDone,
            status === 'error' && styles.uploadZoneError,
          ]}
          onPress={handleZonePress}
          disabled={zoneDisabled}
          activeOpacity={0.75}
        >
          {imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              {status === 'uploading' && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color={Colors.white} />
                </View>
              )}
              {status === 'done' && (
                <View style={styles.overlay}>
                  <View style={styles.checkCircle}>
                    <MaterialIcons name="check" size={28} color={Colors.white} />
                  </View>
                </View>
              )}
              {status === 'error' && (
                <View style={styles.overlay}>
                  <MaterialIcons name={Icons.warning as any} size={36} color={Colors.white} />
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.idlePlaceholder}>
              <MaterialIcons name={Icons.camera as any} size={IconSize.large} color={Colors.primary600} />
              <Text style={styles.idleLabel}>{t('auth.onboarding.takeSelfie')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Retake — visible when image is picked and not mid-upload */}
        {imageUri !== null && status !== 'uploading' && (
          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
            <MaterialIcons name={Icons.camera as any} size={IconSize.status} color={Colors.primary600} />
            <Text style={styles.retakeBtnLabel}>{t('auth.onboarding.retake')}</Text>
          </TouchableOpacity>
        )}

        {/* Tips */}
        <View style={styles.tips}>
          <TipRow label={t('auth.onboarding.selfieTip1')} />
          <TipRow label={t('auth.onboarding.selfieTip2')} />
        </View>

        <View style={styles.footer}>
          <Button
            label={t('common.next')}
            onPress={() => router.push('/(auth)/expert-onboarding/tazkira' as any)}
            disabled={status !== 'done'}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

function TipRow({ label }: { label: string }) {
  return (
    <View style={styles.tipRow}>
      <MaterialIcons name="check" size={IconSize.status} color={Colors.success600} />
      <Text style={styles.tipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.s4,
    marginBottom: Spacing.s4,
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
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight,
    color: Colors.gray400,
  },
  title: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight,
    color: Colors.primary600,
    marginBottom: Spacing.s2,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight,
    color: Colors.gray600,
    marginBottom: Spacing.s6,
  },

  // Upload zone
  uploadZone: {
    height: 220,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary600,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZoneDone: {
    borderStyle: 'solid',
    borderColor: Colors.success600,
    borderWidth: 2,
  },
  uploadZoneError: {
    borderStyle: 'solid',
    borderColor: Colors.danger600,
    borderWidth: 1.5,
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
    gap: Spacing.s2,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  idlePlaceholder: {
    alignItems: 'center',
    gap: Spacing.s3,
  },
  idleLabel: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight,
    color: Colors.primary600,
  },

  // Retake button
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s1,
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s2,
  },
  retakeBtnLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.primary600,
  },

  // Tips
  tips: {
    flexDirection: 'row',
    gap: Spacing.s6,
    marginTop: Spacing.s5,
    flexWrap: 'wrap',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s1,
  },
  tipText: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight,
    color: Colors.gray600,
  },

  footer: {
    marginTop: 'auto',
  },
});
