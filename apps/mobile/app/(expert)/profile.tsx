import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth.store";
import { useLangStore, type Lang } from "@/stores/lang.store";
import { authService } from "@/services/auth.service";
import { usersService, type UserProfile } from "@/services/users.service";
import { lookupService, type Zone } from "@/services/lookup.service";

interface SettingRow {
  key: string;
  label: string;
  icon: string;
  rightLabel?: string;
  onPress?: () => void;
}

function getVerificationVariant(
  status?: string,
): "success" | "warning" | "danger" | "gray" {
  if (status === "VERIFIED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "gray";
}

function getVerificationLabel(status?: string): string {
  if (status === "VERIFIED") return "Verified";
  if (status === "PENDING") return "Pending";
  if (status === "REJECTED") return "Rejected";
  return "Unverified";
}

export default function ExpertProfileScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  const editSheetRef = useRef<BottomSheetModal>(null);
  const zonesSheetRef = useRef<BottomSheetModal>(null);
  const langSheetRef = useRef<BottomSheetModal>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const [editName, setEditName] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profileRes, zonesRes] = await Promise.all([
        usersService.getMe(),
        lookupService.zones(),
      ]);
      setProfile(profileRes.data);
      setAllZones(zonesRes.data ?? []);
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
    setEditName(user?.name ?? "");
    setEditNameError("");
    editSheetRef.current?.present();
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setEditNameError(t("expert.profile.errorName"));
      return;
    }
    setSaving(true);
    try {
      await usersService.updateMe({ name: editName.trim() });
      await updateUser({ name: editName.trim() });
      editSheetRef.current?.dismiss();
      toast.show({
        message: t("expert.profile.savedToast"),
        variant: "success",
      });
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleZone = async (zone: Zone) => {
    const expertProfile = profile?.expertProfile;
    const currentZoneIds =
      expertProfile?.serviceZones?.map((sz) => sz.zone.id) ?? [];
    let newZoneIds: string[];
    if (currentZoneIds.includes(zone.id)) {
      newZoneIds = currentZoneIds.filter((id) => id !== zone.id);
    } else {
      newZoneIds = [...currentZoneIds, zone.id];
    }
    setZonesLoading(true);
    try {
      await usersService.updateZones(newZoneIds);
      const profileRes = await usersService.getMe();
      setProfile(profileRes.data);
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setZonesLoading(false);
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

  const expertProfile = profile?.expertProfile;
  const verificationStatus = expertProfile?.verificationStatus;
  const creditBalance = expertProfile?.creditBalance?.balance ?? 0;
  const completedJobs = expertProfile?.completedJobs ?? 0;
  const completionRate = expertProfile?.completionRate ?? 0;
  const rating = expertProfile?.rating ?? 0;
  const noShowCount = expertProfile?.noShowCount ?? 0;
  const serviceZones = expertProfile?.serviceZones ?? [];

  const settingsSections: SettingRow[][] = [
    [
      {
        key: "reviews",
        label: t("expert.profile.myReviews"),
        icon: Icons.star,
      },
      {
        key: "verifyDocs",
        label: t("expert.profile.verifyDocs"),
        icon: Icons.verified,
      },
      {
        key: "zones",
        label: t("expert.profile.serviceZones"),
        icon: Icons.location,
        onPress: () => zonesSheetRef.current?.present(),
      },
    ],
    [
      {
        key: "notifications",
        label: t("expert.profile.notificationSettings"),
        icon: Icons.notifs,
      },
      {
        key: "language",
        label: t("expert.profile.language"),
        icon: Icons.language,
        rightLabel: t(`common.language.${lang}`),
        onPress: () => langSheetRef.current?.present(),
      },
    ],
    [
      { key: "help", label: t("expert.profile.helpSupport"), icon: Icons.help },
      { key: "about", label: t("expert.profile.aboutFixr"), icon: Icons.about },
    ],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("expert.profile.title")}</Text>
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
                <View style={styles.verifyRow}>
                  <Pill
                    label={getVerificationLabel(verificationStatus)}
                    variant={getVerificationVariant(verificationStatus)}
                  />
                </View>
                <Text style={styles.profilePhone}>
                  {"\u200E"}
                  {user?.phone}
                </Text>
              </View>
              <TouchableOpacity onPress={openEditSheet} style={styles.editBtn}>
                <Text style={styles.editBtnText}>
                  {t("expert.profile.edit")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credits card */}
          <View style={styles.creditsCard}>
            <Text style={styles.creditsSectionLabel}>
              {t("expert.profile.yourCredits")}
            </Text>
            <View style={styles.creditsRow}>
              <Text style={styles.creditCount}>{creditBalance}</Text>
              <Text style={styles.creditsAvailable}>
                {t("expert.profile.creditsAvailable")}
              </Text>
            </View>
            <Button
              label={t("expert.profile.buyCredits")}
              onPress={() =>
                toast.show({ message: t("expert.profile.comingSoon") })
              }
              style={styles.buyBtn}
            />
            <Text style={styles.creditsCaption}>
              {t("expert.profile.creditsCaption")}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedJobs}</Text>
              <Text style={styles.statLabel}>
                {t("expert.profile.completed")}
              </Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(completionRate * 100)}%
              </Text>
              <Text style={styles.statLabel}>
                {t("expert.profile.completion")}
              </Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statRating]}>
                ★ {rating.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>{t("expert.profile.rating")}</Text>
            </View>
            {noShowCount > 0 && (
              <>
                <View style={styles.statSep} />
                <View style={styles.statItem}>
                  <View style={styles.noShowRow}>
                    <MaterialIcons
                      name="cancel"
                      size={14}
                      color={Colors.danger600}
                    />
                    <Text style={[styles.statValue, styles.statDanger]}>
                      {noShowCount}
                    </Text>
                  </View>
                  <Text style={[styles.statLabel, styles.statLabelDanger]}>
                    {t("expert.profile.noShows")}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Settings sections */}
          {settingsSections.map((section, sIdx) => (
            <View key={sIdx} style={styles.section}>
              {section.map((row, rIdx) => (
                <View key={row.key}>
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={row.onPress}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={row.icon as any}
                      size={22}
                      color={Colors.gray600}
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
                      />
                    )}
                  </TouchableOpacity>
                  {rIdx < section.length - 1 ? (
                    <Divider style={styles.rowDivider} />
                  ) : null}
                </View>
              ))}
            </View>
          ))}

          {/* Log out */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.logoutRow}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>
                {t("expert.profile.logout")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      {/* Edit name sheet */}
      <BottomSheet ref={editSheetRef} snapPoints={["40%"]}>
        <Text style={styles.sheetTitle}>
          {t("expert.profile.editNameTitle")}
        </Text>
        <Input
          label={t("expert.profile.nameLabel")}
          placeholder={t("expert.profile.namePlaceholder")}
          value={editName}
          onChangeText={setEditName}
          error={editNameError}
          onBlur={() => {
            if (!editName.trim())
              setEditNameError(t("expert.profile.errorName"));
            else setEditNameError("");
          }}
          autoCapitalize="words"
          style={styles.sheetInput}
        />
        <Button
          label={t("expert.profile.saveChanges")}
          onPress={handleSaveName}
          loading={saving}
        />
      </BottomSheet>

      {/* Language picker sheet */}
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
            {idx < arr.length - 1 && <Divider style={styles.zoneDivider} />}
          </View>
        ))}
      </BottomSheet>

      {/* Service zones sheet */}
      <BottomSheet ref={zonesSheetRef} snapPoints={["60%"]}>
        <Text style={styles.sheetTitle}>
          {t("expert.profile.serviceZonesTitle")}
        </Text>
        {zonesLoading ? (
          <View style={styles.zonesLoading}>
            <ActivityIndicator color={Colors.primary600} />
          </View>
        ) : (
          <FlatList
            data={allZones}
            keyExtractor={(z) => z.id}
            renderItem={({ item: zone, index }) => {
              const isSelected = serviceZones.some(
                (sz) => sz.zone.id === zone.id,
              );
              return (
                <View>
                  <TouchableOpacity
                    style={styles.zoneRow}
                    onPress={() => handleToggleZone(zone)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.zoneName,
                        isSelected && styles.zoneNameSelected,
                      ]}
                    >
                      {zone.nameEn ?? zone.name}
                    </Text>
                    {isSelected ? (
                      <MaterialIcons
                        name={"check-box" as any}
                        size={22}
                        color={Colors.primary600}
                      />
                    ) : (
                      <MaterialIcons
                        name={"check-box-outline-blank" as any}
                        size={22}
                        color={Colors.gray400}
                      />
                    )}
                  </TouchableOpacity>
                  {index < allZones.length - 1 && (
                    <Divider style={styles.zoneDivider} />
                  )}
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
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
    borderRadius: Radius.md,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.s3,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    ...Typography.heading2,
  },
  verifyRow: {
    flexDirection: "row",
  },
  profilePhone: {
    ...Typography.caption,
    writingDirection: "ltr",
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.primary600,
  },
  // Credits card
  creditsCard: {
    backgroundColor: Colors.primary50,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    borderWidth: 1.5,
    borderColor: Colors.primary100,
  },
  creditsSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary600,
    letterSpacing: 0.72,
    textTransform: "uppercase",
    marginBottom: Spacing.s2,
  },
  creditsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.s2,
    marginBottom: Spacing.s3,
  },
  creditCount: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary600,
  },
  creditsAvailable: {
    ...Typography.body,
    color: Colors.gray600,
  },
  buyBtn: {
    marginBottom: Spacing.s2,
  },
  creditsCaption: {
    ...Typography.caption,
    color: Colors.gray600,
    textAlign: "center",
    marginTop: Spacing.s1,
  },
  // Stats
  statsCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.gray900,
  },
  statRating: {
    color: Colors.primary600,
  },
  statDanger: {
    color: Colors.danger600,
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: Colors.gray600,
    textAlign: "center",
  },
  statLabelDanger: {
    color: Colors.danger600,
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: Colors.gray200,
  },
  noShowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  // Settings
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: "hidden",
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
    fontSize: 15,
    fontWeight: "600",
    color: Colors.danger600,
  },
  bottomPad: {
    height: Spacing.s6,
  },
  settingRightLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.gray400,
  },
  // Bottom sheets
  sheetTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.s4,
  },
  sheetInput: {
    marginBottom: Spacing.s4,
  },
  // Language picker
  langRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    height: 52,
  },
  langLabel: {
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  langLabelActive: {
    color: Colors.primary600,
    fontWeight: "600" as const,
  },
  zonesLoading: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  zoneName: {
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  zoneNameSelected: {
    color: Colors.primary600,
    fontWeight: "600",
  },
  zoneDivider: {
    marginVertical: 0,
  },
});
