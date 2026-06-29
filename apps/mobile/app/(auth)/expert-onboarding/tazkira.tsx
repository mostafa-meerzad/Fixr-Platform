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
import { mediaService, type ExpertMediaTarget } from '@/services/media.service';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface UploadZoneProps {
  label: string;
  uri: string | null;
  status: UploadStatus;
  onPress: () => void;
  onRetake: () => void;
}

function UploadZone({ label, uri, status, onPress, onRetake }: UploadZoneProps) {
  const { t } = useTranslation();
  const disabled = status === 'uploading' || status === 'done';

  return (
    <View style={styles.zoneWrapper}>
      <Text style={styles.zoneLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.uploadZone,
          status === 'done' && styles.uploadZoneDone,
          status === 'error' && styles.uploadZoneError,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
      >
        {uri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri }} style={styles.image} />
            {status === 'uploading' && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={Colors.white} />
              </View>
            )}
            {status === 'done' && (
              <View style={styles.overlay}>
                <View style={styles.checkCircle}>
                  <MaterialIcons name="check" size={24} color={Colors.white} />
                </View>
              </View>
            )}
            {status === 'error' && (
              <View style={styles.overlay}>
                <MaterialIcons name={Icons.warning as any} size={28} color={Colors.white} />
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.idlePlaceholder}>
            <MaterialIcons name={Icons.image as any} size={32} color={Colors.primary600} />
            <Text style={styles.idleLabel}>{t('auth.onboarding.takePhoto')}</Text>
          </View>
        )}
      </TouchableOpacity>
      {uri !== null && status !== 'uploading' && (
        <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
          <MaterialIcons name={Icons.camera as any} size={IconSize.status} color={Colors.primary600} />
          <Text style={styles.retakeBtnLabel}>{t('auth.onboarding.retake')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TazkiraScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [frontMime, setFrontMime] = useState<string | undefined>(undefined);
  const [frontStatus, setFrontStatus] = useState<UploadStatus>('idle');

  const [backUri, setBackUri] = useState<string | null>(null);
  const [backMime, setBackMime] = useState<string | undefined>(undefined);
  const [backStatus, setBackStatus] = useState<UploadStatus>('idle');

  async function pickAndUpload(
    target: ExpertMediaTarget,
    setUri: (v: string | null) => void,
    setMime: (v: string | undefined) => void,
    setStatus: (v: UploadStatus) => void,
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
    await doUpload(target, asset.uri, asset.mimeType ?? undefined, setStatus);
  }

  async function doUpload(
    target: ExpertMediaTarget,
    uri: string,
    mimeType: string | undefined,
    setStatus: (v: UploadStatus) => void,
  ) {
    setStatus('uploading');
    try {
      await mediaService.uploadExpert(target, uri, mimeType);
      setStatus('done');
    } catch {
      setStatus('error');
      toast.show({ message: t('auth.onboarding.uploadError'), variant: 'error' });
    }
  }

  async function retake(
    target: ExpertMediaTarget,
    setUri: (v: string | null) => void,
    setMime: (v: string | undefined) => void,
    setStatus: (v: UploadStatus) => void,
  ) {
    setUri(null);
    setMime(undefined);
    setStatus('idle');
    await pickAndUpload(target, setUri, setMime, setStatus);
  }

  return (
    <ScreenWrapper>
      <ProgressBar currentStep={2} totalSteps={3} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.stepLabel}>
            {t('auth.onboarding.stepLabel', { current: 2, total: 3 })}
          </Text>
        </View>

        <Text style={styles.title}>{t('auth.onboarding.tazkiraTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.tazkiraSubtitle')}</Text>

        <UploadZone
          label={t('auth.onboarding.tazkiraFrontLabel')}
          uri={frontUri}
          status={frontStatus}
          onPress={() => {
            if (frontStatus === 'idle') {
              pickAndUpload('tazkira_front', setFrontUri, setFrontMime, setFrontStatus);
            } else if (frontStatus === 'error' && frontUri) {
              doUpload('tazkira_front', frontUri, frontMime, setFrontStatus);
            }
          }}
          onRetake={() => retake('tazkira_front', setFrontUri, setFrontMime, setFrontStatus)}
        />

        <UploadZone
          label={t('auth.onboarding.tazkiraBackLabel')}
          uri={backUri}
          status={backStatus}
          onPress={() => {
            if (backStatus === 'idle') {
              pickAndUpload('tazkira_back', setBackUri, setBackMime, setBackStatus);
            } else if (backStatus === 'error' && backUri) {
              doUpload('tazkira_back', backUri, backMime, setBackStatus);
            }
          }}
          onRetake={() => retake('tazkira_back', setBackUri, setBackMime, setBackStatus)}
        />

        <View style={styles.footer}>
          <Button
            label={t('common.next')}
            onPress={() => router.push('/(auth)/expert-onboarding/business' as any)}
            disabled={frontStatus !== 'done' || backStatus !== 'done'}
          />
        </View>
      </View>
    </ScreenWrapper>
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
    marginBottom: Spacing.s5,
  },
  zoneWrapper: {
    marginBottom: Spacing.s4,
  },
  zoneLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight,
    color: Colors.gray600,
    marginBottom: Spacing.s2,
  },
  uploadZone: {
    height: 160,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    gap: Spacing.s2,
  },
  idleLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.primary600,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s1,
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s1,
  },
  retakeBtnLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.primary600,
  },
  footer: {
    marginTop: 'auto',
  },
});
