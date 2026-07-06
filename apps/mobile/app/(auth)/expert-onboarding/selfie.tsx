import React, { useState } from 'react';
import {
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
import { useOnboardingStore } from '@/stores/onboarding.store';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

export default function SelfieScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { setSelfie } = useOnboardingStore();

  const [imageUri, setImageUri] = useState<string | null>(null);

  async function pickImage() {
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
    setSelfie(asset.uri, asset.mimeType ?? undefined);
  }

  return (
    <ScreenWrapper>
      <ProgressBar currentStep={1} totalSteps={4} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.stepLabel}>
            {t('auth.onboarding.stepLabel', { current: 1, total: 4 })}
          </Text>
        </View>

        <Text style={styles.title}>{t('auth.onboarding.selfieTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.selfieSubtitle')}</Text>

        <TouchableOpacity
          style={[styles.uploadZone, imageUri ? styles.uploadZoneDone : null]}
          onPress={imageUri ? undefined : pickImage}
          disabled={imageUri !== null}
          activeOpacity={0.75}
        >
          {imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.overlay}>
                <View style={styles.checkCircle}>
                  <MaterialIcons name="check" size={28} color={Colors.white} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.idlePlaceholder}>
              <MaterialIcons name={Icons.camera as any} size={IconSize.large} color={Colors.primary600} />
              <Text style={styles.idleLabel}>{t('auth.onboarding.takeSelfie')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {imageUri !== null && (
          <TouchableOpacity style={styles.retakeBtn} onPress={pickImage}>
            <MaterialIcons name={Icons.camera as any} size={IconSize.status} color={Colors.primary600} />
            <Text style={styles.retakeBtnLabel}>{t('auth.onboarding.retake')}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tips}>
          <TipRow label={t('auth.onboarding.selfieTip1')} />
          <TipRow label={t('auth.onboarding.selfieTip2')} />
        </View>

        <View style={styles.footer}>
          <Button
            label={t('common.next')}
            onPress={() => router.push('/(auth)/expert-onboarding/tazkira' as any)}
            disabled={imageUri === null}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idlePlaceholder: {
    alignItems: 'center',
    gap: Spacing.s3,
  },
  idleLabel: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.primary600,
  },
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
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray600,
  },
  footer: {
    marginTop: 'auto',
  },
});
