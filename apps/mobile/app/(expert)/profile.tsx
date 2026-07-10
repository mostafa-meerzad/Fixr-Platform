import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Colors, IconSize, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
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
import { lookupService, type Category, type Zone } from "@/services/lookup.service";

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

function getVerificationLabel(status: string | undefined, t: (k: string) => string): string {
  if (status === "VERIFIED") return t("expert.profile.statusVerified");
  if (status === "PENDING") return t("expert.profile.statusPending");
  if (status === "REJECTED") return t("expert.profile.statusRejected");
  return t("expert.profile.statusNotSubmitted");
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
  const buySheetRef = useRef<BottomSheetModal>(null);
  const notifSheetRef = useRef<BottomSheetModal>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

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

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setHasError(false);
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
        toast.show({
          message: t("expert.profile.minOneCategory"),
          variant: "error",
        });
        return;
      }
      current.delete(cat.id);
    } else {
      current.add(cat.id);
    }
    setCategoriesLoading(true);
    try {
      await usersService.updateCategories(Array.from(current));
      const profileRes = await usersService.getMe();
      setProfile(profileRes.data);
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

  const insets = useSafeAreaInsets();
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
        onPress: () => user && router.push(`/(shared)/reviews/${user.id}` as any),
      },
      {
        key: "verifyDocs",
        label: t("expert.profile.verifyDocs"),
        icon: Icons.verified,
        onPress: () => {
          if (verificationStatus === "VERIFIED") {
            toast.show({ message: t("expert.profile.alreadyVerified") });
          } else if (verificationStatus === "PENDING") {
            toast.show({ message: t("expert.profile.pendingVerification") });
          } else {
            router.push("/(auth)/expert-onboarding/selfie" as any);
          }
        },
      },
      {
        key: "zones",
        label: t("expert.profile.serviceZones"),
        icon: Icons.location,
        onPress: () => zonesSheetRef.current?.present(),
      },
      {
        key: "categories",
        label: t("expert.profile.serviceCategories"),
        icon: Icons.category,
        onPress: () => {
          loadCategoriesIfNeeded();
          categoriesSheetRef.current?.present();
        },
      },
    ],
    [
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
    ],
    [
      {
        key: "help",
        label: t("expert.profile.helpSupport"),
        icon: Icons.help,
        onPress: () => router.push("/(shared)/help" as any),
      },
      {
        key: "about",
        label: t("expert.profile.aboutFixr"),
        icon: Icons.about,
        onPress: () => router.push("/(shared)/about" as any),
      },
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
              <Avatar
                size={56}
                name={user?.name}
                uri={profile?.avatarUrl ?? profile?.expertProfile?.selfieUrl ?? user?.avatarUrl}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <View style={styles.verifyRow}>
                  <Pill
                    label={getVerificationLabel(verificationStatus, t)}
                    variant={getVerificationVariant(verificationStatus)}
                  />
                </View>
                <Text style={styles.profilePhone}>
                  {"\u200E"}
                  {user?.phone}
                </Text>
              </View>
              <TouchableOpacity
                onPress={openEditSheet}
                style={styles.editBtn}
                accessibilityLabel={t("expert.profile.edit")}
                accessibilityRole="button"
              >
                <Text style={styles.editBtnText}>
                  {t("expert.profile.edit")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {hasError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{t("expert.profile.loadError")}</Text>
              <TouchableOpacity onPress={() => load(false)} accessibilityRole="button">
                <Text style={styles.retryText}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Credits card */}
          <View style={styles.sectionGap} />
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
            <TouchableOpacity
              onPress={() => router.push("/(expert)/credits" as any)}
              activeOpacity={0.7}
              style={styles.viewHistoryBtn}
              accessibilityLabel={t("expert.profile.viewHistory")}
              accessibilityRole="button"
            >
              <Text style={styles.viewHistoryText}>
                {t("expert.profile.viewHistory")}
              </Text>
              <MaterialIcons
                name={Icons.chevronRight as any}
                size={14}
                color={Colors.primary600}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </TouchableOpacity>
            <Button
              label={t("expert.profile.buyCredits")}
              onPress={() => buySheetRef.current?.present()}
              style={styles.buyBtn}
            />
            <Text style={styles.creditsCaption}>
              {t("expert.profile.creditsCaption")}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.sectionGap} />
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
              <View style={styles.ratingRow}>
                <MaterialIcons
                  name={Icons.star as any}
                  size={IconSize.status}
                  color={Colors.primary600}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={[styles.statValue, styles.statRating]}>
                  {rating.toFixed(1)}
                </Text>
              </View>
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
                      accessibilityElementsHidden
                      importantForAccessibility="no"
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
              accessibilityLabel={t("expert.profile.logout")}
              accessibilityRole="button"
            >
              <Text style={styles.logoutText}>
                {t("expert.profile.logout")}
              </Text>
            </TouchableOpacity>
          </View>
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
                        name={"check_box" as any}
                        size={22}
                        color={Colors.primary600}
                      />
                    ) : (
                      <View style={styles.uncheckedBox} />
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

      {/* Service categories sheet */}
      <BottomSheet ref={categoriesSheetRef} snapPoints={["60%"]}>
        <Text style={styles.sheetTitle}>
          {t("expert.profile.serviceCategoriesTitle")}
        </Text>
        {categoriesLoading ? (
          <View style={styles.zonesLoading}>
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
                      <Text
                        style={[
                          styles.zoneName,
                          isSelected && styles.zoneNameSelected,
                        ]}
                      >
                        {cat.nameEn ?? cat.name}
                      </Text>
                      {isSelected ? (
                        <MaterialIcons
                          name={"check_box" as any}
                          size={22}
                          color={Colors.primary600}
                        />
                      ) : (
                        <View style={styles.uncheckedBox} />
                      )}
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

      {/* Buy Credits sheet */}
      <BottomSheet ref={buySheetRef} snapPoints={["55%"]}>
        <View style={styles.buySheetIconWrap}>
          <MaterialIcons name={"storefront" as any} size={40} color={Colors.primary600} />
        </View>
        <Text style={styles.buySheetTitle}>{t("expert.buySheet.title")}</Text>
        <Text style={styles.buySheetBody}>{t("expert.buySheet.body")}</Text>
        <View style={styles.buySheetInfoRows}>
          <View style={styles.buySheetRow}>
            <MaterialIcons name={"place" as any} size={18} color={Colors.primary600} />
            <Text style={styles.buySheetRowText}>{t("expert.buySheet.address")}</Text>
          </View>
          <TouchableOpacity
            style={styles.buySheetRow}
            onPress={() => Linking.openURL(`tel:${t("expert.buySheet.phone")}`)}
            activeOpacity={0.7}
          >
            <MaterialIcons name={"phone" as any} size={18} color={Colors.primary600} />
            <Text style={[styles.buySheetRowText, styles.buySheetPhoneText]}>
              {t("expert.buySheet.phone")}
            </Text>
          </TouchableOpacity>
          <View style={styles.buySheetRow}>
            <MaterialIcons name={"schedule" as any} size={18} color={Colors.primary600} />
            <Text style={styles.buySheetRowText}>{t("expert.buySheet.hours")}</Text>
          </View>
        </View>
        <Button
          label={t("expert.buySheet.dismiss")}
          onPress={() => buySheetRef.current?.dismiss()}
        />
      </BottomSheet>

      {/* Notification Settings sheet */}
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
    fontWeight: "600",
    color: Colors.danger600,
  },
  // Section gap — iOS Settings-style gray-100 strip between sections
  sectionGap: {
    height: 8,
    backgroundColor: Colors.gray100,
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
  // Ghost button — no border, 44pt minimum touch target
  editBtn: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.s2,
  },
  editBtnText: {
    ...Typography.label,
    color: Colors.primary600,
  },
  // Credits card — primary-50 bg / primary-100 border per spec
  creditsCard: {
    backgroundColor: Colors.primary50,
    marginHorizontal: Spacing.s4,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    borderWidth: 1.5,
    borderColor: Colors.primary100,
    ...Shadows.sm,
  },
  creditsSectionLabel: {
    ...Typography.captionMd,
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
  viewHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
    marginBottom: Spacing.s1,
    gap: Spacing.s1,
  },
  viewHistoryText: {
    ...Typography.label,
    color: Colors.primary600,
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
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    ...Shadows.sm,
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
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s1,
  },
  statRating: {
    color: Colors.primary600,
  },
  statDanger: {
    color: Colors.danger600,
  },
  statLabel: {
    ...Typography.caption,
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
  settingRightLabel: {
    ...Typography.label,
    color: Colors.gray400,
  },
  uncheckedBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.gray400,
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
    paddingHorizontal: Spacing.s4,
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
  categoriesList: {
    flex: 1,
  },
  categoriesDoneBtn: {
    marginTop: Spacing.s4,
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
  // Buy Credits sheet
  buySheetIconWrap: {
    alignItems: "center",
    marginBottom: Spacing.s3,
  },
  buySheetTitle: {
    ...Typography.heading2,
    textAlign: "center",
    marginBottom: Spacing.s2,
  },
  buySheetBody: {
    ...Typography.body,
    color: Colors.gray600,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.s4,
  },
  buySheetInfoRows: {
    gap: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  buySheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
  },
  buySheetRowText: {
    ...Typography.bodyMd,
    color: Colors.gray900,
    flex: 1,
  },
  buySheetPhoneText: {
    color: Colors.primary600,
  },
});
