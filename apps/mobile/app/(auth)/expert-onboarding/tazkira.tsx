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

interface UploadZoneProps {
  label: string;
  uri: string | null;
  onPress: () => void;
  onRetake: () => void;
}

function UploadZone({ label, uri, onPress, onRetake }: UploadZoneProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.zoneWrapper}>
      <Text style={styles.zoneLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.uploadZone, uri ? styles.uploadZoneDone : null]}
        onPress={uri ? undefined : onPress}
        disabled={uri !== null}
        activeOpacity={0.75}
      >
        {uri ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri }} style={styles.image} />
            <View style={styles.overlay}>
              <View style={styles.checkCircle}>
                <MaterialIcons name="check" size={24} color={Colors.white} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.idlePlaceholder}>
            <MaterialIcons name={Icons.image as any} size={32} color={Colors.primary600} />
            <Text style={styles.idleLabel}>{t('auth.onboarding.takePhoto')}</Text>
          </View>
        )}
      </TouchableOpacity>
      {uri !== null && (
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
  const { setTazkiraFront, setTazkiraBack } = useOnboardingStore();

  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  async function pickImage(
    setUri: (v: string | null) => void,
    storeSet: (uri: string | null, mime?: string) => void,
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
    storeSet(asset.uri, asset.mimeType ?? undefined);
  }

  return (
    <ScreenWrapper>
      <ProgressBar currentStep={2} totalSteps={4} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.stepLabel}>
            {t('auth.onboarding.stepLabel', { current: 2, total: 4 })}
          </Text>
        </View>

        <Text style={styles.title}>{t('auth.onboarding.tazkiraTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.tazkiraSubtitle')}</Text>

        <UploadZone
          label={t('auth.onboarding.tazkiraFrontLabel')}
          uri={frontUri}
          onPress={() => pickImage(setFrontUri, setTazkiraFront)}
          onRetake={() => {
            setFrontUri(null);
            setTazkiraFront(null);
            pickImage(setFrontUri, setTazkiraFront);
          }}
        />

        <UploadZone
          label={t('auth.onboarding.tazkiraBackLabel')}
          uri={backUri}
          onPress={() => pickImage(setBackUri, setTazkiraBack)}
          onRetake={() => {
            setBackUri(null);
            setTazkiraBack(null);
            pickImage(setBackUri, setTazkiraBack);
          }}
        />

        <View style={styles.footer}>
          <Button
            label={t('common.next')}
            onPress={() => router.push('/(auth)/expert-onboarding/categories' as any)}
            disabled={frontUri === null || backUri === null}
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
    marginBottom: Spacing.s5,
  },
  zoneWrapper: {
    marginBottom: Spacing.s4,
  },
  zoneLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
