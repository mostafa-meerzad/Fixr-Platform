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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

const CIRCLE_SIZE = 200;

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

    let result: ImagePicker.ImagePickerResult | null = null;
    try {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.85,
      });
    } catch {
      // Camera unavailable (e.g. iOS Simulator) — fall back to library
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libPerm.status !== 'granted') {
        toast.show({ message: t('auth.onboarding.permissionDenied'), variant: 'error' });
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.85,
      });
    }

    if (!result || result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    setSelfie(asset.uri, asset.mimeType ?? undefined);
  }

  return (
    <ScreenWrapper>
      <StepIndicator total={4} current={1} />

      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.onboarding.selfieTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.selfieSubtitle')}</Text>

        {/* Circle upload zone */}
        <View style={styles.circleArea}>
          <TouchableOpacity
            style={styles.circle}
            onPress={imageUri ? undefined : pickImage}
            disabled={imageUri !== null}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.circleImage} />
            ) : (
              <View style={styles.circlePlaceholder}>
                <MaterialCommunityIcons
                  name={Icons.camera as any}
                  size={IconSize.large}
                  color={Colors.primary600}
                />
                <Text style={styles.circlePrompt}>
                  {t('auth.onboarding.takeSelfie')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Green check badge */}
          {imageUri && (
            <View style={styles.checkBadge}>
              <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
            </View>
          )}
        </View>

        {/* Retake button (shown only after capture) */}
        {imageUri && (
          <TouchableOpacity style={styles.retakeBtn} onPress={pickImage}>
            <MaterialCommunityIcons
              name={Icons.camera as any}
              size={IconSize.status}
              color={Colors.primary600}
            />
            <Text style={styles.retakeBtnLabel}>
              {t('auth.onboarding.retake')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Checklist card */}
        <View style={styles.checklistCard}>
          <CheckRow label={t('auth.onboarding.selfieCheck1')} />
          <CheckRow label={t('auth.onboarding.selfieCheck2')} />
          <CheckRow label={t('auth.onboarding.selfieCheck3')} />
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={indicatorStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            indicatorStyles.segment,
            i < current
              ? indicatorStyles.segmentFilled
              : indicatorStyles.segmentEmpty,
          ]}
        />
      ))}
    </View>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <View style={styles.checkRow}>
      <MaterialCommunityIcons name="check" size={16} color={Colors.success600} />
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
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
  segment: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
  },
  segmentFilled: {
    backgroundColor: Colors.primary600,
  },
  segmentEmpty: {
    backgroundColor: Colors.sand,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s6,
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

  // Circle
  circleArea: {
    alignItems: 'center',
    marginBottom: Spacing.s4,
    position: 'relative',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.primary50,
    borderWidth: 2,
    borderColor: Colors.primary100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    resizeMode: 'cover',
  },
  circlePlaceholder: {
    alignItems: 'center',
    gap: Spacing.s3,
  },
  circlePrompt: {
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
    color: Colors.primary600,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 8,
    right: '50%',
    marginRight: -(CIRCLE_SIZE / 2) + 12,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },

  // Retake
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s1,
    paddingVertical: Spacing.s2,
    marginBottom: Spacing.s4,
  },
  retakeBtnLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
    color: Colors.primary600,
  },

  // Checklist card
  checklistCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  checkLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    flex: 1,
  },

  footer: {
    marginTop: 'auto',
  },
});
