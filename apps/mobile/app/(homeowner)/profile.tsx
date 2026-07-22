import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
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

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

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
  const [completedJobs, setCompletedJobs] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);

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
      setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      await updateUser({ avatarUrl: url });
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [profileRes, jobsRes] = await Promise.all([
        usersService.getMe(),
        jobsService.list({ limit: 50, page: 1 }),
      ]);
      const p = profileRes.data;
      setProfile(p);
      const jobsBody = jobsRes.data as JobListResponse;
      setTotalJobs(jobsBody.total);
      setCompletedJobs(jobsBody.data.filter((j) => j.status === "COMPLETED").length);
      if (p.avatarUrl) await updateUser({ avatarUrl: p.avatarUrl });
    } catch {
      // show what we have from auth store
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      toast.show({ message: t("homeowner.profile.errorNetwork"), variant: "error" });
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

  const positivePoints = profile?.homeownerProfile?.positivePoints ?? 0;
  const zoneName = profile?.homeownerProfile?.zone?.nameEn;
  const phoneSubtitle = [user?.phone, zoneName].filter(Boolean).join(" · ");

  const avatarUri = profile?.avatarUrl ?? user?.avatarUrl;

  const settingRows: SettingRow[] = [
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
  ];

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Identity card ── */}
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <TouchableOpacity
                onPress={handleAvatarChange}
                disabled={avatarUploading}
                style={styles.avatarWrap}
                activeOpacity={0.8}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  {avatarUploading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <MaterialIcons name="photo-camera" size={14} color={Colors.white} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.identityInfo}>
                <Text style={styles.identityName}>{user?.name}</Text>
                <Text style={styles.identityPhone}>{"‎"}{phoneSubtitle}</Text>
              </View>

              <TouchableOpacity onPress={openEditSheet} style={styles.editBtn} activeOpacity={0.7}>
                <Text style={styles.editBtnText}>{t("homeowner.profile.editProfile")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Stats tiles ── */}
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{totalJobs}</Text>
              <Text style={styles.statLabel}>{t("homeowner.profile.jobsPosted")}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{completedJobs}</Text>
              <Text style={styles.statLabel}>{t("homeowner.profile.completed")}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={[styles.statValue, positivePoints > 0 && styles.statPositive]}>
                {positivePoints > 0 ? `+${positivePoints}` : positivePoints}
              </Text>
              <Text style={styles.statLabel}>{t("homeowner.profile.positive")}</Text>
            </View>
          </View>

          {/* ── Settings (single card) ── */}
          <View style={styles.menuCard}>
            {settingRows.map((row, idx) => (
              <View key={row.key}>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={row.onPress}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name={row.icon as any} size={22} color={Colors.gray600} />
                  <Text style={styles.menuLabel}>{row.label}</Text>
                  {row.rightLabel ? (
                    <Text style={styles.menuRightLabel}>{row.rightLabel}</Text>
                  ) : null}
                  <MaterialIcons name={Icons.chevronRight as any} size={20} color={Colors.gray400} />
                </TouchableOpacity>
                {idx < settingRows.length - 1 && (
                  <Divider style={styles.rowDivider} />
                )}
              </View>
            ))}
          </View>

          {/* ── Log out ── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>{t("homeowner.profile.logout")}</Text>
          </TouchableOpacity>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      {/* ── Edit name sheet ── */}
      <BottomSheet ref={editSheetRef} snapPoints={["40%"]}>
        <Text style={styles.sheetTitle}>{t("homeowner.profile.editNameTitle")}</Text>
        <Input
          label={t("homeowner.profile.nameLabel")}
          placeholder={t("homeowner.profile.namePlaceholder")}
          value={editName}
          onChangeText={setEditName}
          error={editNameError}
          onBlur={() => {
            if (!editName.trim()) setEditNameError(t("homeowner.profile.errorName"));
            else setEditNameError("");
          }}
          autoCapitalize="words"
          style={styles.sheetInput}
        />
        <Button
          label={t("homeowner.profile.saveChanges")}
          onPress={handleSaveName}
          loading={saving}
        />
      </BottomSheet>

      {/* ── Language sheet ── */}
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
              <Text style={[styles.langLabel, lang === option && styles.langLabelActive]}>
                {t(`common.language.${option}`)}
              </Text>
              {lang === option && (
                <MaterialIcons name="check" size={20} color={Colors.primary600} />
              )}
            </TouchableOpacity>
            {idx < arr.length - 1 && <Divider style={styles.rowDivider} />}
          </View>
        ))}
      </BottomSheet>

      {/* ── Notification settings sheet ── */}
      <BottomSheet ref={notifSheetRef} snapPoints={["30%"]}>
        <Text style={styles.sheetTitle}>{t("shared.notifSettings.title")}</Text>
        <View style={styles.notifRow}>
          <Text style={styles.notifLabel}>{t("shared.notifSettings.pushNotifications")}</Text>
          {notifGranted === true ? (
            <Text style={styles.notifEnabled}>{t("shared.notifSettings.enabled")}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={styles.notifSettingsBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.notifSettingsBtnText}>{t("shared.notifSettings.openSettings")}</Text>
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
  scrollContent: {
    padding: Spacing.s4,
    gap: Spacing.s3,
  },

  // ── Identity card ──
  identityCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    ...Shadows.sm,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s3,
  },
  avatarWrap: {
    position: "relative",
    width: 56,
    height: 56,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary600,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  identityInfo: {
    flex: 1,
    gap: 3,
  },
  identityName: {
    ...Typography.heading2,
  },
  identityPhone: {
    ...Typography.caption,
    writingDirection: "ltr",
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.primary600,
  },

  // ── Stats tiles ──
  statsRow: {
    flexDirection: "row",
    gap: Spacing.s3,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.s3,
    alignItems: "center",
    gap: 3,
    ...Shadows.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.gray900,
  },
  statPositive: {
    color: Colors.success600,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: Colors.gray600,
    textAlign: "center",
  },

  // ── Settings menu card ──
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadows.sm,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
  },
  menuLabel: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  menuRightLabel: {
    ...Typography.label,
    color: Colors.gray400,
  },
  rowDivider: {
    marginVertical: 0,
    marginHorizontal: Spacing.s4,
  },

  // ── Log out ──
  logoutBtn: {
    alignItems: "center",
    paddingVertical: Spacing.s3,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary600,
  },

  bottomPad: {
    height: Spacing.s4,
  },

  // ── Bottom sheets ──
  sheetTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.s4,
  },
  sheetInput: {
    marginBottom: Spacing.s4,
  },
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
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    gap: Spacing.s3,
  },
  notifLabel: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  notifEnabled: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.success600,
  },
  notifSettingsBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
  },
  notifSettingsBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary600,
  },
});
