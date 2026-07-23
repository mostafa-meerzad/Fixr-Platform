import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth.store";
import { useLangStore, type Lang } from "@/stores/lang.store";
import { authService } from "@/services/auth.service";
import { usersService, type UserProfile } from "@/services/users.service";
import { lookupService, type Category, type Zone } from "@/services/lookup.service";

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface MenuRow {
  key: string;
  label: string;
  icon: string;
  rightLabel?: string;
  onPress?: () => void;
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
  const categoriesSheetRef = useRef<BottomSheetModal>(null);
  const langSheetRef = useRef<BottomSheetModal>(null);
  const notifSheetRef = useRef<BottomSheetModal>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === "granted");
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [profileRes, zonesRes] = await Promise.all([
        usersService.getMe(),
        lookupService.zones(),
      ]);
      const p = profileRes.data;
      setProfile(p);
      setAllZones(zonesRes.data ?? []);
      const resolvedAvatar = p.avatarUrl ?? p.expertProfile?.selfieUrl ?? undefined;
      if (resolvedAvatar) await updateUser({ avatarUrl: resolvedAvatar });
    } catch {
      // fall back to auth store data
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
      setEditNameError(t("expert.profile.errorName"));
      return;
    }
    setSaving(true);
    try {
      await usersService.updateMe({ name: editName.trim() });
      await updateUser({ name: editName.trim() });
      editSheetRef.current?.dismiss();
      toast.show({ message: t("expert.profile.savedToast"), variant: "success" });
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleZone = async (zone: Zone) => {
    const ep = profile?.expertProfile;
    const currentIds = ep?.serviceZones?.map((sz) => sz.zone.id) ?? [];
    const newIds = currentIds.includes(zone.id)
      ? currentIds.filter((id) => id !== zone.id)
      : [...currentIds, zone.id];
    setZonesLoading(true);
    try {
      await usersService.updateZones(newIds);
      const res = await usersService.getMe();
      setProfile(res.data);
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setZonesLoading(false);
    }
  };

  const loadCategoriesIfNeeded = async () => {
    if (allCategories.length > 0) return;
    setCategoriesLoading(true);
    try {
      const res = await lookupService.categories();
      setAllCategories(res.data ?? []);
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleToggleCategory = async (cat: Category) => {
    const current = new Set(
      expertProfile?.serviceCategories.map((sc) => sc.category.id) ?? [],
    );
    if (current.has(cat.id)) {
      if (current.size === 1) {
        toast.show({ message: t("expert.profile.minOneCategory"), variant: "error" });
        return;
      }
      current.delete(cat.id);
    } else {
      current.add(cat.id);
    }
    setCategoriesLoading(true);
    try {
      await usersService.updateCategories(Array.from(current));
      const res = await usersService.getMe();
      setProfile(res.data);
    } catch {
      toast.show({ message: t("common.error"), variant: "error" });
    } finally {
      setCategoriesLoading(false);
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
  const serviceZones = expertProfile?.serviceZones ?? [];
  const serviceCategories = expertProfile?.serviceCategories ?? [];

  const shopName = expertProfile?.shopName;
  const firstZoneEn = serviceZones[0]?.zone?.nameEn;
  const shopLine = [shopName, firstZoneEn].filter(Boolean).join(" · ");

  const createdAt = (profile as any)?.createdAt as string | undefined;
  const experienceYears = createdAt
    ? Math.max(1, new Date().getFullYear() - new Date(createdAt).getFullYear())
    : null;

  const initials = getInitials(user?.name);

  const menuItems: MenuRow[] = [
    {
      key: "reviews",
      label: t("expert.profile.myReviews"),
      icon: Icons.star,
      onPress: () => user && router.push(`/(shared)/reviews/${user.id}` as any),
    },
    {
      key: "shopServices",
      label: t("expert.profile.shopServices"),
      icon: Icons.homeRepair,
      onPress: () => {
        loadCategoriesIfNeeded();
        categoriesSheetRef.current?.present();
      },
    },
    {
      key: "notifications",
      label: t("expert.profile.notificationSettings"),
      icon: Icons.notifs,
      onPress: () => notifSheetRef.current?.present(),
    },
    {
      key: "language",
      label: t("expert.profile.language"),
      icon: Icons.language,
      rightLabel: t(`common.language.${lang}`),
      onPress: () => langSheetRef.current?.present(),
    },
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
          {/* Terra cotta hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>{initials}</Text>
              </View>
              <View style={styles.heroInfo}>
                <View style={styles.heroNameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>{user?.name}</Text>
                  {verificationStatus === "VERIFIED" && (
                    <MaterialCommunityIcons name={Icons.verified as any} size={16} color={Colors.white} />
                  )}
                </View>
                {!!shopLine && (
                  <Text style={styles.heroShop} numberOfLines={1}>{shopLine}</Text>
                )}
                {serviceCategories.length > 0 && (
                  <View style={styles.heroPills}>
                    {serviceCategories.slice(0, 3).map((sc) => (
                      <View key={sc.category.id} style={styles.heroPill}>
                        <Text style={styles.heroPillText}>
                          {(sc.category.nameEn ?? sc.category.name ?? "").toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.heroEditBtn}
                onPress={openEditSheet}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={Icons.edit as any} size={15} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroStatsDivider} />

            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>★ {rating.toFixed(1)}</Text>
                <Text style={styles.heroStatLabel}>
                  {completedJobs} {t("expert.profile.reviews")}
                </Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{completedJobs}</Text>
                <Text style={styles.heroStatLabel}>{t("expert.profile.jobsDone")}</Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{Math.round(completionRate * 100)}%</Text>
                <Text style={styles.heroStatLabel}>{t("expert.profile.winRate")}</Text>
              </View>
              <View style={styles.heroStatSep} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {experienceYears !== null ? `${experienceYears} yrs` : "—"}
                </Text>
                <Text style={styles.heroStatLabel}>{t("expert.profile.experience")}</Text>
              </View>
            </View>
          </View>

          {/* Dark credits card */}
          <View style={styles.creditsCard}>
            <View style={styles.creditsLeft}>
              <View style={styles.creditsIconWrap}>
                <MaterialCommunityIcons name={Icons.credit as any} size={20} color={Colors.amber} />
              </View>
              <View style={styles.creditsInfo}>
                <Text style={styles.creditsCount}>
                  {creditBalance} {t("expert.profile.credits")}
                </Text>
                <Text style={styles.creditsCaption}>{t("expert.profile.creditsCaption")}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => router.push("/(expert)/credits" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.buyBtnText}>{t("expert.profile.buyCredits")}</Text>
            </TouchableOpacity>
          </View>

          {/* Menu card */}
          <View style={styles.menuCard}>
            {menuItems.map((row, idx) => (
              <View key={row.key}>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={row.onPress}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name={row.icon as any} size={22} color={Colors.gray600} />
                  <Text style={styles.menuLabel}>{row.label}</Text>
                  {row.rightLabel ? (
                    <Text style={styles.menuRightLabel}>{row.rightLabel}</Text>
                  ) : (
                    <MaterialCommunityIcons
                      name={Icons.chevronRight as any}
                      size={20}
                      color={Colors.gray400}
                    />
                  )}
                </TouchableOpacity>
                {idx < menuItems.length - 1 && (
                  <Divider style={styles.rowDivider} />
                )}
              </View>
            ))}
          </View>

          {/* Log out */}
          <TouchableOpacity
            style={styles.logoutRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>{t("expert.profile.logout")}</Text>
          </TouchableOpacity>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      {/* Edit name sheet */}
      <BottomSheet ref={editSheetRef} snapPoints={["40%"]}>
        <Text style={styles.sheetTitle}>{t("expert.profile.editNameTitle")}</Text>
        <Input
          label={t("expert.profile.nameLabel")}
          placeholder={t("expert.profile.namePlaceholder")}
          value={editName}
          onChangeText={setEditName}
          error={editNameError}
          onBlur={() => {
            if (!editName.trim()) setEditNameError(t("expert.profile.errorName"));
            else setEditNameError("");
          }}
          autoCapitalize="words"
          style={styles.sheetInput}
        />
        <Button label={t("expert.profile.saveChanges")} onPress={handleSaveName} loading={saving} />
      </BottomSheet>

      {/* Language sheet */}
      <BottomSheet ref={langSheetRef} snapPoints={["28%"]}>
        <Text style={styles.sheetTitle}>{t("common.language.title")}</Text>
        {(["en", "fa"] as Lang[]).map((option, idx, arr) => (
          <View key={option}>
            <TouchableOpacity
              style={styles.langRow}
              onPress={async () => { await setLang(option); langSheetRef.current?.dismiss(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.langLabel, lang === option && styles.langLabelActive]}>
                {t(`common.language.${option}`)}
              </Text>
              {lang === option && (
                <MaterialCommunityIcons name="check" size={20} color={Colors.primary600} />
              )}
            </TouchableOpacity>
            {idx < arr.length - 1 && <Divider style={styles.zoneDivider} />}
          </View>
        ))}
      </BottomSheet>

      {/* Service zones sheet */}
      <BottomSheet ref={zonesSheetRef} snapPoints={["60%"]}>
        <Text style={styles.sheetTitle}>{t("expert.profile.serviceZonesTitle")}</Text>
        {zonesLoading ? (
          <View style={styles.sheetLoading}>
            <ActivityIndicator color={Colors.primary600} />
          </View>
        ) : (
          <FlatList
            data={allZones}
            keyExtractor={(z) => z.id}
            renderItem={({ item: zone, index }) => {
              const isSelected = serviceZones.some((sz) => sz.zone.id === zone.id);
              return (
                <View>
                  <TouchableOpacity
                    style={styles.zoneRow}
                    onPress={() => handleToggleZone(zone)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.zoneName, isSelected && styles.zoneNameSelected]}>
                      {zone.nameEn ?? zone.name}
                    </Text>
                    <MaterialCommunityIcons
                      name={(isSelected ? "check_box" : "check_box_outline_blank") as any}
                      size={22}
                      color={isSelected ? Colors.primary600 : Colors.gray400}
                    />
                  </TouchableOpacity>
                  {index < allZones.length - 1 && <Divider style={styles.zoneDivider} />}
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </BottomSheet>

      {/* Service categories sheet */}
      <BottomSheet ref={categoriesSheetRef} snapPoints={["60%"]}>
        <Text style={styles.sheetTitle}>{t("expert.profile.serviceCategoriesTitle")}</Text>
        {categoriesLoading ? (
          <View style={styles.sheetLoading}>
            <ActivityIndicator color={Colors.primary600} />
          </View>
        ) : (
          <>
            <FlatList
              data={allCategories}
              keyExtractor={(c) => c.id}
              renderItem={({ item: cat, index }) => {
                const isSelected = expertProfile?.serviceCategories.some(
                  (sc) => sc.category.id === cat.id,
                );
                return (
                  <View>
                    <TouchableOpacity
                      style={styles.zoneRow}
                      onPress={() => handleToggleCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.zoneName, isSelected && styles.zoneNameSelected]}>
                        {cat.nameEn ?? cat.name}
                      </Text>
                      <MaterialCommunityIcons
                        name={(isSelected ? "check_box" : "check_box_outline_blank") as any}
                        size={22}
                        color={isSelected ? Colors.primary600 : Colors.gray400}
                      />
                    </TouchableOpacity>
                    {index < allCategories.length - 1 && (
                      <Divider style={styles.zoneDivider} />
                    )}
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
              style={styles.categoriesList}
            />
            <Button
              label={t("common.done")}
              onPress={() => categoriesSheetRef.current?.dismiss()}
              style={styles.categoriesDoneBtn}
            />
          </>
        )}
      </BottomSheet>



      {/* Notification Settings sheet */}
      <BottomSheet ref={notifSheetRef} snapPoints={["30%"]}>
        <Text style={styles.sheetTitle}>{t("shared.notifSettings.title")}</Text>
        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>{t("shared.notifSettings.pushNotifications")}</Text>
          </View>
          {notifGranted === true ? (
            <Text style={styles.notifEnabled}>{t("shared.notifSettings.enabled")}</Text>
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
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  title: { ...Typography.display },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero card
  heroCard: {
    backgroundColor: Colors.primary600,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s4,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.s3,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.primary600,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.white,
    flexShrink: 1,
  },
  heroShop: {
    fontSize: 13,
    color: Colors.primary100,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: Spacing.s1,
  },
  heroPill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s2,
    paddingVertical: 3,
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  heroEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroStatsDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: Spacing.s3,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  heroStatLabel: {
    fontSize: 11,
    color: Colors.primary100,
    textAlign: "center",
  },
  heroStatSep: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // Dark credits card
  creditsCard: {
    backgroundColor: Colors.dark,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s3,
  },
  creditsLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
  },
  creditsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(232,160,32,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  creditsInfo: {
    flex: 1,
    gap: 2,
  },
  creditsCount: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.amber,
  },
  creditsCaption: {
    fontSize: 12,
    color: Colors.gray400,
    lineHeight: 16,
  },
  buyBtn: {
    backgroundColor: Colors.amber,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s2,
    flexShrink: 0,
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.dark,
  },

  // Menu card
  menuCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: "hidden",
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
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.gray400,
  },
  rowDivider: {
    marginVertical: 0,
    marginHorizontal: Spacing.s4,
  },

  // Log out
  logoutRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.s4,
    marginTop: Spacing.s3,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary600,
  },

  bottomPad: { height: Spacing.s6 },

  // Sheets
  sheetTitle: { ...Typography.heading2, marginBottom: Spacing.s4 },
  sheetInput: { marginBottom: Spacing.s4 },
  sheetLoading: { height: 120, alignItems: "center", justifyContent: "center" },
  langRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    height: 52,
  },
  langLabel: { ...Typography.bodyMd, color: Colors.gray900 },
  langLabelActive: { color: Colors.primary600, fontWeight: "600" as const },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  zoneName: { ...Typography.bodyMd, color: Colors.gray900 },
  zoneNameSelected: { color: Colors.primary600, fontWeight: "600" as const },
  zoneDivider: { marginVertical: 0 },
  categoriesList: { flex: 1 },
  categoriesDoneBtn: { marginTop: Spacing.s4 },
  notifRow: { flexDirection: "row", alignItems: "center", height: 52, gap: Spacing.s3 },
  notifInfo: { flex: 1 },
  notifLabel: { ...Typography.bodyMd, color: Colors.gray900 },
  notifEnabled: { fontSize: 13, fontWeight: "600" as const, color: Colors.success600 },
  notifSettingsBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: 8,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
  },
  notifSettingsBtnText: { fontSize: 13, fontWeight: "600" as const, color: Colors.primary600 },
});
