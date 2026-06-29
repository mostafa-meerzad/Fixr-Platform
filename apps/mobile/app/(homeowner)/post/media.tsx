import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { mediaService } from '@/services/media.service';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

interface PhotoItem {
  uri: string;
  mediaId: string;
  status: 'uploading' | 'done' | 'error';
}

interface VideoItem {
  uri: string;
  mediaId: string;
  status: 'uploading' | 'done' | 'error';
  duration?: number;
}

function formatDuration(ms?: number): string {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MediaScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [video, setVideo] = useState<VideoItem | null>(null);

  function handleBack() {
    Alert.alert(
      t('homeowner.post.goBackTitle'),
      t('homeowner.post.goBackMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('homeowner.post.goBackConfirm'), onPress: () => router.back() },
      ],
    );
  }

  async function handleAddPhoto() {
    if (photos.length >= 3) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const tempId = `temp-${Date.now()}`;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setPhotos((prev) => [...prev, { uri: asset.uri, mediaId: tempId, status: 'uploading' }]);

    try {
      const uploaded = await mediaService.uploadJobMedia(jobId, asset.uri, mimeType);
      setPhotos((prev) =>
        prev.map((p) => (p.mediaId === tempId ? { ...p, mediaId: uploaded.id, status: 'done' } : p)),
      );
    } catch {
      setPhotos((prev) =>
        prev.map((p) => (p.mediaId === tempId ? { ...p, status: 'error' } : p)),
      );
      toast.show({ message: t('homeowner.post.photoUploadError'), variant: 'error' });
    }
  }

  async function handleRemovePhoto(mediaId: string, status: PhotoItem['status']) {
    setPhotos((prev) => prev.filter((p) => p.mediaId !== mediaId));
    if (status === 'done') {
      try {
        await mediaService.deleteJobMedia(mediaId);
      } catch {
        // Non-fatal
      }
    }
  }

  async function handleAddVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 120,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const tempId = `temp-${Date.now()}`;

    setVideo({ uri: asset.uri, mediaId: tempId, status: 'uploading', duration: asset.duration ?? undefined });

    try {
      const uploaded = await mediaService.uploadJobMedia(jobId, asset.uri, 'video/mp4');
      setVideo((prev) => (prev ? { ...prev, mediaId: uploaded.id, status: 'done' } : null));
    } catch {
      setVideo(null);
      toast.show({ message: t('homeowner.post.photoUploadError'), variant: 'error' });
    }
  }

  async function handleRemoveVideo() {
    if (!video) return;
    const { mediaId, status } = video;
    setVideo(null);
    if (status === 'done') {
      try {
        await mediaService.deleteJobMedia(mediaId);
      } catch {
        // Non-fatal
      }
    }
  }

  function handleContinue() {
    router.push(`/(homeowner)/post/review?jobId=${jobId}` as any);
  }

  const uploadingPhotos = photos.some((p) => p.status === 'uploading');
  const uploadingVideo = video?.status === 'uploading';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressBar currentStep={5} totalSteps={6} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>
          {t('homeowner.post.stepLabel', { current: 5, total: 6 })}
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{t('homeowner.post.step5Title')}</Text>
        <Text style={styles.caption}>{t('homeowner.post.step5Caption')}</Text>

        {/* ── Photos ── */}
        <Text style={styles.sectionLabel}>{t('homeowner.post.photosLabel')}</Text>
        <View style={styles.photoRow}>
          {[0, 1, 2].map((i) => {
            const photo = photos[i];
            const isNextSlot = i === photos.length;

            if (photo) {
              return (
                <View key={i} style={styles.photoSlot}>
                  {photo.status === 'uploading' ? (
                    <View style={[styles.photoSlotFill, { backgroundColor: Colors.primary50 }]}>
                      <ActivityIndicator color={Colors.primary600} />
                    </View>
                  ) : photo.status === 'error' ? (
                    <View style={[styles.photoSlotFill, { backgroundColor: Colors.danger100 }]}>
                      <MaterialIcons name={'broken_image' as any} size={24} color={Colors.danger600} />
                    </View>
                  ) : (
                    <Image source={{ uri: photo.uri }} style={styles.photoSlotFill} resizeMode="cover" />
                  )}
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(photo.mediaId, photo.status)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <MaterialIcons name="cancel" size={22} color={Colors.danger600} />
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
                  activeOpacity={0.7}
                >
                  <MaterialIcons name={Icons.addPhoto as any} size={24} color={Colors.gray400} />
                </TouchableOpacity>
              );
            }

            return <View key={i} style={[styles.photoSlot, styles.photoSlotGhost]} />;
          })}
        </View>

        {/* ── Video ── */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.s5 }]}>{t('homeowner.post.videoLabel')}</Text>

        {video ? (
          <View style={styles.videoBox}>
            {video.status === 'uploading' ? (
              <View style={styles.videoPlaceholder}>
                <ActivityIndicator color={Colors.primary600} />
                <Text style={styles.videoCaption}>{t('common.loading')}</Text>
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <MaterialIcons name={Icons.video as any} size={32} color={Colors.gray400} />
                {video.duration != null && (
                  <Text style={styles.videoCaption}>{formatDuration(video.duration)}</Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={styles.removeVideoBtn}
              onPress={handleRemoveVideo}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <MaterialIcons name="cancel" size={22} color={Colors.danger600} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addVideoBtn}
            onPress={handleAddVideo}
            activeOpacity={0.7}
          >
            <MaterialIcons name={Icons.video as any} size={20} color={Colors.gray400} />
            <Text style={styles.addVideoText}>{t('homeowner.post.addVideo')}</Text>
          </TouchableOpacity>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Button
            label={t('common.continue')}
            onPress={handleContinue}
            disabled={uploadingPhotos || uploadingVideo === true}
          />
          <Button
            label={t('common.skip')}
            variant="ghost"
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s2,
    paddingBottom: Spacing.s2,
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

  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s6,
  },
  pageTitle: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s2,
  },
  caption: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    marginBottom: Spacing.s5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary600,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    marginBottom: Spacing.s3,
  },

  // ── Photo slots ──
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: 'visible',
    position: 'relative',
  },
  photoSlotFill: {
    flex: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoSlotEmpty: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  photoSlotGhost: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
    opacity: 0.5,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    zIndex: 1,
  },

  // ── Video ──
  videoBox: {
    position: 'relative',
  },
  videoPlaceholder: {
    height: 100,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s2,
  },
  videoCaption: {
    fontSize: 12,
    color: Colors.gray400,
  },
  removeVideoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  addVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s2,
    height: 52,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
  },
  addVideoText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray600,
  },

  // ── Footer ──
  footer: {
    marginTop: Spacing.s8,
    gap: Spacing.s2,
  },
});
