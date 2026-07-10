import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, IconSize, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth.store";
import { useLangStore, type Lang } from "@/stores/lang.store";
import { authService } from "@/services/auth.service";
import { jobsService, type JobListResponse } from "@/services/jobs.service";
import { mediaService } from "@/services/media.service";
import { usersService, type UserProfile } from "@/services/users.service";

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

  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  const editSheetRef = useRef<BottomSheetModal>(null);
  const langSheetRef = useRef<BottomSheetModal>(null);
  const notifSheetRef = useRef<BottomSheetModal>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [editName, setEditName] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === "granted");
    });
  }, []);

  const handleAvatarChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const { url } = await mediaService.uploadAvatar(asset.uri, asset.mimeType ?? undefined);
      setProfile((prev) => prev ? { ...prev, avatarUrl: url } : prev);
      await updateUser({ avatarUrl: url });
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setHasError(false);
    try {
      const [profileRes, jobsRes, completedRes] = await Promise.all([
        usersService.getMe(),
        jobsService.list({ limit: 1, page: 1 }),
        jobsService.list({ limit: 1, page: 1, status: 'COMPLETED' }),
      ]);
      const p = profileRes.data;
      setProfile(p);
      setTotalJobs((jobsRes.data as JobListResponse).total);
      setTotalCompleted((completedRes.data as JobListResponse).total);
      if (p.avatarUrl) await updateUser({ avatarUrl: p.avatarUrl });
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const openEditSheet = () => {
    setEditName(user?.name ?? "");
    setEditNameError("");
    editSheetRef.current?.present();
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setEditNameError(t("homeowner.profile.errorName"));
      return;
    }
    setSaving(true);
    try {
      await usersService.updateMe({ name: editName.trim() });
      await updateUser({ name: editName.trim() });
      editSheetRef.current?.dismiss();
      toast.show({ message: t("homeowner.profile.savedToast"), variant: "success" });
    } catch {
      toast.show({
        message: t("homeowner.profile.errorNetwork"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("fixr_refresh_token");
      if (refreshToken) await authService.logout(refreshToken);
    } catch {}
    await clearAuth();
    router.replace("/(auth)/phone");
  };

  const settingsSections: SettingRow[][] = [
    [
      {
        key: "reviews",
        label: t("homeowner.profile.myReviews"),
        icon: Icons.star,
        onPress: () => user && router.push(`/(shared)/reviews/${user.id}` as any),
      },
      {
        key: "issues",
        label: t("homeowner.profile.reportedIssues"),
        icon: Icons.warning,
        onPress: () => router.push("/(homeowner)/disputes" as any),
      },
    ],
    [
      {
        key: "notifications",
        label: t("homeowner.profile.notificationSettings"),
        icon: Icons.notifs,
        onPress: () => notifSheetRef.current?.present(),
      },
      {
        key: "language",
        label: t("homeowner.profile.language"),
        icon: Icons.language,
        rightLabel: t(`common.language.${lang}`),
        onPress: () => langSheetRef.current?.present(),
      },
    ],
    [
      {
        key: "help",
        label: t("homeowner.profile.helpSupport"),
        icon: Icons.help,
        onPress: () => router.push("/(shared)/help" as any),
      },
      {
        key: "about",
        label: t("homeowner.profile.aboutFixr"),
        icon: Icons.about,
        onPress: () => router.push("/(shared)/about" as any),
      },
    ],
  ];

  const positivePoints = profile?.homeownerProfile?.positivePoints ?? 0;
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("homeowner.profile.title")}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary600}
              colors={[Colors.primary600]}
            />
          }
        >
          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <TouchableOpacity
                onPress={handleAvatarChange}
                disabled={avatarUploading}
                style={styles.avatarWrap}
                accessibilityLabel={t("homeowner.profile.changePhoto")}
                accessibilityRole="button"
              >
                <Avatar size={56} name={user?.name} uri={profile?.avatarUrl ?? user?.avatarUrl} />
                <View style={styles.avatarOverlay}>
                  {avatarUploading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <MaterialIcons name="photo-camera" size={14} color={Colors.white} />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profilePhone}>{'\u200E'}{user?.phone}</Text>
              </View>
              <TouchableOpacity
                onPress={openEditSheet}
                style={styles.editBtn}
                accessibilityLabel={t("homeowner.profile.editProfile")}
                accessibilityRole="button"
              >
                <Text style={styles.editBtnText}>
                  {t("homeowner.profile.editProfile")}
                </Text>
              </TouchableOpacity>
            </View>

            <Divider style={styles.statsDivider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalJobs}</Text>
                <Text style={styles.statLabel}>
                  {t("homeowner.profile.jobsPosted")}
                </Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalCompleted}</Text>
                <Text style={styles.statLabel}>
                  {t("homeowner.profile.completed")}
                </Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <View style={styles.statValueRow}>
                  <MaterialIcons
                    name={Icons.thumbUp as any}
                    size={IconSize.status}
                    color={Colors.primary600}
                  />
                  <Text style={[styles.statValue, styles.statPositive]}>
                    {positivePoints > 0 ? `+${positivePoints}` : positivePoints}
                  </Text>
                </View>
                <Text style={styles.statLabel}>
                  {t("homeowner.profile.positive")}
                </Text>
              </View>
            </View>
          </View>

          {hasError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{t("homeowner.profile.loadError")}</Text>
              <TouchableOpacity onPress={() => load(false)} accessibilityRole="button">
                <Text style={styles.retryText}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Settings sections */}
          {settingsSections.map((section, sIdx) => (
            <View key={sIdx}>
              <View style={styles.sectionGap} />
              <View style={styles.section}>
                {section.map((row, rIdx) => (
                  <View key={row.key}>
                    <TouchableOpacity
                      style={styles.settingRow}
                      onPress={row.onPress}
                      activeOpacity={0.7}
                      accessibilityLabel={row.label}
                      accessibilityRole="button"
                    >
                      <MaterialIcons
                        name={row.icon as any}
                        size={22}
                        color={Colors.gray600}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                      <Text style={styles.settingLabel}>{row.label}</Text>
                      {row.rightLabel ? (
                        <Text style={styles.settingRightLabel}>
                          {row.rightLabel}
                        </Text>
                      ) : (
                        <MaterialIcons
                          name={Icons.chevronRight as any}
                          size={20}
                          color={Colors.gray400}
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                        />
                      )}
                    </TouchableOpacity>
                    {rIdx < section.length - 1 ? (
                      <Divider style={styles.rowDivider} />
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Log out */}
          <View style={styles.sectionGap} />
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.logoutRow}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityLabel={t("homeowner.profile.logout")}
              accessibilityRole="button"
            >
              <Text style={styles.logoutText}>
                {t("homeowner.profile.logout")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <BottomSheet ref={editSheetRef} snapPoints={["40%"]}>
        <Text style={styles.sheetTitle}>
          {t("homeowner.profile.editNameTitle")}
        </Text>
        <Input
          label={t("homeowner.profile.nameLabel")}
          placeholder={t("homeowner.profile.namePlaceholder")}
          value={editName}
          onChangeText={setEditName}
          error={editNameError}
          onBlur={() => {
            if (!editName.trim())
              setEditNameError(t("homeowner.profile.errorName"));
            else setEditNameError("");
          }}
          autoCapitalize="words"
          style={styles.sheetInput}
        />
        <Button
          label={t("homeowner.profile.saveChanges")}
          onPress={handleSaveName}
          loading={saving}
          style={styles.sheetBtn}
        />
      </BottomSheet>

      <BottomSheet ref={langSheetRef} snapPoints={["28%"]}>
        <Text style={styles.sheetTitle}>{t("common.language.title")}</Text>
        {(["en", "fa"] as Lang[]).map((option, idx, arr) => (
          <View key={option}>
            <TouchableOpacity
              style={styles.langRow}
              onPress={async () => {
                await setLang(option);
                langSheetRef.current?.dismiss();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langLabel,
                  lang === option && styles.langLabelActive,
                ]}
              >
                {t(`common.language.${option}`)}
              </Text>
              {lang === option && (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={Colors.primary600}
                />
              )}
            </TouchableOpacity>
            {idx < arr.length - 1 && <Divider style={styles.rowDivider} />}
          </View>
        ))}
      </BottomSheet>

      <BottomSheet ref={notifSheetRef} snapPoints={["30%"]}>
        <Text style={styles.sheetTitle}>
          {t("shared.notifSettings.title")}
        </Text>
        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>
              {t("shared.notifSettings.pushNotifications")}
            </Text>
          </View>
          {notifGranted === true ? (
            <Text style={styles.notifEnabled}>
              {t("shared.notifSettings.enabled")}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={styles.notifSettingsBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.notifSettingsBtnText}>
                {t("shared.notifSettings.openSettings")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  // Profile card
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s4,
    marginBottom: Spacing.s3,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s3,
  },
  avatarWrap: {
    position: "relative",
    width: 56,
    height: 56,
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary600,
    alignItems: "center",
    justifyContent: "center",
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
    writingDirection: "ltr",
  },
  // Ghost button — no border, minimum 44pt touch target
  editBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.s2,
  },
  editBtnText: {
    ...Typography.label,
    color: Colors.primary600,
  },
  statsDivider: {
    marginVertical: Spacing.s3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.gray900,
  },
  statPositive: {
    color: Colors.primary600,
  },
  statLabel: {
    ...Typography.caption,
    textAlign: "center",
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: Colors.gray200,
  },
  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.danger100,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
  },
  errorText: {
    ...Typography.label,
    color: Colors.danger600,
  },
  retryText: {
    ...Typography.label,
    color: Colors.danger600,
    fontWeight: "600",
  },
  // Section gap — iOS Settings-style gray-100 strip between sections
  sectionGap: {
    height: 8,
    backgroundColor: Colors.gray100,
  },
  // Settings
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: "hidden",
    ...Shadows.sm,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    ...Typography.bodyMd,
    color: Colors.danger600,
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
  // Language picker
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
  },
  langLabel: {
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  langLabelActive: {
    color: Colors.primary600,
    fontWeight: "600",
  },
  // Notification settings sheet
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    gap: Spacing.s3,
  },
  notifInfo: {
    flex: 1,
  },
  notifLabel: {
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  notifEnabled: {
    ...Typography.label,
    fontWeight: "600",
    color: Colors.success600,
  },
  notifSettingsBtn: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s3,
  },
  notifSettingsBtnText: {
    ...Typography.label,
    fontWeight: "600",
    color: Colors.primary600,
  },
});
