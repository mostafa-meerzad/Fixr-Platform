import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { jobsService, type JobListResponse } from '@/services/jobs.service';
import { usersService, type UserProfile } from '@/services/users.service';

interface SettingRow {
  key: string;
  label: string;
  icon: string;
  rightLabel?: string;
  onPress?: () => void;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const editSheetRef = useRef<BottomSheetModal>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profileRes, jobsRes] = await Promise.all([
        usersService.getMe(),
        jobsService.list({ limit: 1, page: 1 }),
      ]);
      setProfile(profileRes.data);
      setTotalJobs((jobsRes.data as JobListResponse).total);
    } catch {
      // show what we have from auth store
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditSheet = () => {
    setEditName(user?.name ?? '');
    setEditNameError('');
    editSheetRef.current?.present();
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setEditNameError(t('homeowner.profile.errorName'));
      return;
    }
    setSaving(true);
    try {
      await usersService.updateMe({ name: editName.trim() });
      await updateUser({ name: editName.trim() });
      editSheetRef.current?.dismiss();
      toast.show({ message: 'Profile updated', variant: 'success' });
    } catch {
      toast.show({ message: t('homeowner.profile.errorNetwork'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('fixr_refresh_token');
      if (refreshToken) await authService.logout(refreshToken);
    } catch {}
    await clearAuth();
    router.replace('/(auth)/phone');
  };

  const settingsSections: SettingRow[][] = [
    [
      { key: 'reviews', label: t('homeowner.profile.myReviews'), icon: Icons.star },
      { key: 'issues', label: t('homeowner.profile.reportedIssues'), icon: Icons.warning },
    ],
    [
      { key: 'notifications', label: t('homeowner.profile.notificationSettings'), icon: Icons.notifs },
      {
        key: 'language',
        label: t('homeowner.profile.language'),
        icon: Icons.language,
        rightLabel: t('homeowner.profile.languageValue'),
      },
    ],
    [
      { key: 'help', label: t('homeowner.profile.helpSupport'), icon: Icons.help },
      { key: 'about', label: t('homeowner.profile.aboutFixr'), icon: Icons.about },
    ],
  ];

  const positivePoints = profile?.homeownerProfile?.positivePoints ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('homeowner.profile.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Avatar size={56} name={user?.name} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profilePhone}>{user?.phone}</Text>
              </View>
              <TouchableOpacity onPress={openEditSheet} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{t('homeowner.profile.editProfile')}</Text>
              </TouchableOpacity>
            </View>

            <Divider style={styles.statsDivider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalJobs}</Text>
                <Text style={styles.statLabel}>{t('homeowner.profile.jobsPosted')}</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>{t('homeowner.profile.completed')}</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.statPositive]}>
                  {positivePoints > 0 ? `+${positivePoints}` : positivePoints}
                </Text>
                <Text style={styles.statLabel}>{t('homeowner.profile.positive')}</Text>
              </View>
            </View>
          </View>

          {/* Settings sections */}
          {settingsSections.map((section, sIdx) => (
            <View key={sIdx} style={styles.section}>
              {section.map((row, rIdx) => (
                <View key={row.key}>
                  <TouchableOpacity style={styles.settingRow} onPress={row.onPress} activeOpacity={0.7}>
                    <MaterialIcons name={row.icon as any} size={22} color={Colors.gray600} />
                    <Text style={styles.settingLabel}>{row.label}</Text>
                    {row.rightLabel ? (
                      <Text style={styles.settingRightLabel}>{row.rightLabel}</Text>
                    ) : (
                      <MaterialIcons name={Icons.chevronRight as any} size={20} color={Colors.gray400} />
                    )}
                  </TouchableOpacity>
                  {rIdx < section.length - 1 ? <Divider style={styles.rowDivider} /> : null}
                </View>
              ))}
            </View>
          ))}

          {/* Log out */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>{t('homeowner.profile.logout')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      <BottomSheet ref={editSheetRef} snapPoints={['40%']}>
        <Text style={styles.sheetTitle}>{t('homeowner.profile.editNameTitle')}</Text>
        <Input
          label={t('homeowner.profile.nameLabel')}
          placeholder={t('homeowner.profile.namePlaceholder')}
          value={editName}
          onChangeText={setEditName}
          error={editNameError}
          onBlur={() => {
            if (!editName.trim()) setEditNameError(t('homeowner.profile.errorName'));
            else setEditNameError('');
          }}
          autoCapitalize="words"
          style={styles.sheetInput}
        />
        <Button
          label={t('homeowner.profile.saveChanges')}
          onPress={handleSaveName}
          loading={saving}
          style={styles.sheetBtn}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  title: {
    ...Typography.display,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile card
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s4,
    borderRadius: 12,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...Typography.heading2,
  },
  profilePhone: {
    ...Typography.caption,
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary600,
  },
  statsDivider: {
    marginVertical: Spacing.s3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
  },
  statPositive: {
    color: Colors.success600,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray600,
    textAlign: 'center',
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: Colors.gray200,
  },
  // Settings
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  settingLabel: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  settingRightLabel: {
    ...Typography.label,
    color: Colors.gray400,
  },
  rowDivider: {
    marginVertical: 0,
    marginHorizontal: Spacing.s4,
  },
  logoutRow: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger600,
  },
  bottomPad: {
    height: Spacing.s6,
  },
  // Bottom sheet
  sheetTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.s4,
  },
  sheetInput: {
    marginBottom: Spacing.s4,
  },
  sheetBtn: {},
});
