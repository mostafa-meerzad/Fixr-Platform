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

  function handleRetake(
    setUri: (v: string | null) => void,
    storeSet: (uri: string | null, mime?: string) => void,
  ) {
    setUri(null);
    storeSet(null);
    pickImage(setUri, storeSet);
  }

  return (
    <ScreenWrapper scroll>
      <StepIndicator total={4} current={2} />

      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.onboarding.tazkiraTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.tazkiraSubtitle')}</Text>

        <DocZone
          label={t('auth.onboarding.tazkiraFrontLabel')}
          idlePrompt={t('auth.onboarding.tazkiraFrontPrompt')}
          retakeLabel={t('auth.onboarding.tazkiraRetakeFront')}
          uri={frontUri}
          onCapture={() => pickImage(setFrontUri, setTazkiraFront)}
          onRetake={() => handleRetake(setFrontUri, setTazkiraFront)}
        />

        <DocZone
          label={t('auth.onboarding.tazkiraBackLabel')}
          idlePrompt={t('auth.onboarding.tazkiraBackPrompt')}
          retakeLabel={t('auth.onboarding.tazkiraRetakeBack')}
          uri={backUri}
          onCapture={() => pickImage(setBackUri, setTazkiraBack)}
          onRetake={() => handleRetake(setBackUri, setTazkiraBack)}
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

interface DocZoneProps {
  label: string;
  idlePrompt: string;
  retakeLabel: string;
  uri: string | null;
  onCapture: () => void;
  onRetake: () => void;
}

function DocZone({ label, idlePrompt, retakeLabel, uri, onCapture, onRetake }: DocZoneProps) {
  return (
    <View style={styles.zoneWrapper}>
      <Text style={styles.zoneLabel}>{label}</Text>

      <TouchableOpacity
        style={[styles.uploadZone, uri ? styles.uploadZoneDone : null]}
        onPress={uri ? undefined : onCapture}
        disabled={uri !== null}
        activeOpacity={0.8}
      >
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.zoneImage} />
            <View style={styles.checkBadge}>
              <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
            </View>
          </>
        ) : (
          <View style={styles.idlePlaceholder}>
            <MaterialCommunityIcons
              name={Icons.camera as any}
              size={IconSize.btn}
              color={Colors.primary600}
            />
            <Text style={styles.idlePrompt}>{idlePrompt}</Text>
          </View>
        )}
      </TouchableOpacity>

      {uri && (
        <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
          <MaterialCommunityIcons
            name={Icons.camera as any}
            size={IconSize.status}
            color={Colors.primary600}
          />
          <Text style={styles.retakeBtnLabel}>{retakeLabel}</Text>
        </TouchableOpacity>
      )}
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

  // Zone
  zoneWrapper: {
    marginBottom: Spacing.s5,
  },
  zoneLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.s2,
  },
  uploadZone: {
    height: 150,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.sand,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZoneDone: {
    borderStyle: 'solid',
    borderColor: Colors.success600,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
  },
  zoneImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.s2,
    right: Spacing.s2,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  idlePlaceholder: {
    alignItems: 'center',
    gap: Spacing.s2,
  },
  idlePrompt: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.gray600,
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
    fontWeight: '600',
    color: Colors.primary600,
  },

  footer: {
    marginTop: 'auto',
  },
});
