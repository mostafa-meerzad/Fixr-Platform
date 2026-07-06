import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Colors,
  IconSize,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { jobsService } from "@/services/jobs.service";
import { usersService, type UserProfile } from "@/services/users.service";
import {
  lookupService,
  type Category,
  type Zone,
} from "@/services/lookup.service";
import { formatRelativeTime } from "@/utils/format";
import { useAuthStore } from "@/stores/auth.store";

interface BrowseJob {
  id: string;
  title: string;
  status: string;
  urgency: "EMERGENCY" | "TODAY" | "SCHEDULED";
  description?: string;
  address?: string;
  zone: { id: string; nameEn: string; name: string };
  category?: { id: string; nameEn: string; name: string };
  _count: { bids: number };
  openedAt?: string;
  createdAt?: string;
  homeowner: { firstName: string; positivePoints: number; jobsPosted: number };
}

function getUrgencyLabel(urgency: string): string {
  if (urgency === "EMERGENCY") return "Emergency";
  if (urgency === "TODAY") return "Today";
  return "Scheduled";
}

function getUrgencyVariant(urgency: string) {
  if (urgency === "EMERGENCY") return "danger" as const;
  if (urgency === "TODAY") return "warning" as const;
  return "gray" as const;
}

export default function BrowseScreen() {
  const { t } = useTranslation();
  const profileRefreshKey = useAuthStore((s) => s.profileRefreshKey);
  const zoneSheetRef = useRef<BottomSheetModal>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [jobs, setJobs] = useState<BrowseJob[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [zoneUpdating, setZoneUpdating] = useState(false);

  const expertProfile = profile?.expertProfile;
  const verificationStatus = expertProfile?.verificationStatus;
  const creditBalance = expertProfile?.creditBalance?.balance ?? 0;
  const serviceZones = expertProfile?.serviceZones ?? [];
  const primaryZoneName =
    serviceZones[0]?.zone?.nameEn ?? t("expert.browse.noZone");

  const loadFeed = useCallback(
    async (categoryId: string | null) => {
      if (!verificationStatus || verificationStatus !== "VERIFIED") return;
      try {
        const params: Record<string, string | number> = {};
        if (categoryId) params.categoryId = categoryId;
        const res = await jobsService.browse(params);
        const data = res.data as BrowseJob[] | { data: BrowseJob[] };
        setJobs(Array.isArray(data) ? data : (data.data ?? []));
      } catch {
        // feed error — keep existing jobs
      }
    },
    [verificationStatus],
  );

  const load = useCallback(async () => {
    try {
      setError(false);
      const [profileRes, catsRes, zonesRes] = await Promise.all([
        usersService.getMe(),
        lookupService.categories(),
        lookupService.zones(),
      ]);
      setProfile(profileRes.data);
      setCategories(catsRes.data ?? []);
      setZones(zonesRes.data ?? []);

      if (profileRes.data?.expertProfile?.verificationStatus === "VERIFIED") {
        const params: Record<string, string | number> = {};
        if (selectedCategoryId) params.categoryId = selectedCategoryId;
        const feedRes = await jobsService.browse(params);
        const feedData = feedRes.data as BrowseJob[] | { data: BrowseJob[] };
        setJobs(Array.isArray(feedData) ? feedData : (feedData.data ?? []));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  // Reload whenever the tab is focused (catches tab navigation)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Reload when AppState/notification triggers a profile refresh (catches verification approval)
  useEffect(() => {
    if (profileRefreshKey > 0) load();
  }, [profileRefreshKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCategorySelect = async (catId: string | null) => {
    setSelectedCategoryId(catId);
    setFeedLoading(true);
    await loadFeed(catId);
    setFeedLoading(false);
  };

  const handleZoneSelect = async (zone: Zone) => {
    zoneSheetRef.current?.dismiss();
    setZoneUpdating(true);
    try {
      await usersService.updateZones([zone.id]);
      // Refresh profile so zone shows updated
      const profileRes = await usersService.getMe();
      setProfile(profileRes.data);
      await loadFeed(selectedCategoryId);
    } catch {
      // silent
    } finally {
      setZoneUpdating(false);
    }
  };

  useEffect(() => {
    if (!loading && !error && verificationStatus === 'NOT_SUBMITTED') {
      router.replace('/(auth)/expert-onboarding/selfie' as any);
    }
  }, [loading, error, verificationStatus]);

  if (loading || (!error && verificationStatus === 'NOT_SUBMITTED')) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingHeader}>
          <Text style={styles.subtitle}>{t("expert.browse.subtitle")}</Text>
          <Text style={styles.title}>{t("expert.browse.title")}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingHeader}>
          <Text style={styles.subtitle}>{t("expert.browse.subtitle")}</Text>
          <Text style={styles.title}>{t("expert.browse.title")}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button
            label={t("common.retry")}
            onPress={load}
            style={styles.retryBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // PENDING / REJECTED STATES
  if (verificationStatus === "PENDING" || verificationStatus === "REJECTED") {
    const isPending = verificationStatus === "PENDING";
    const bannerBg = isPending ? Colors.warning100 : Colors.danger100;
    const bannerText = isPending ? Colors.warning600 : Colors.danger600;
    const bannerMsg = isPending
      ? t("expert.browse.pendingBanner")
      : t("expert.browse.rejectedBanner");
    const emptyIcon = isPending ? "hourglass_empty" : "cancel";
    const emptyIconColor = isPending ? Colors.warning600 : Colors.danger600;
    const emptyTitle = isPending
      ? t("expert.browse.pendingTitle")
      : t("expert.browse.rejectedTitle");
    const emptySubtitle = isPending
      ? t("expert.browse.pendingSubtitle")
      : t("expert.browse.rejectedSubtitle");

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.verifyHeader}>
          <Text style={styles.subtitle}>{t("expert.browse.subtitle")}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t("expert.browse.title")}</Text>
            <View
              style={[
                styles.creditChip,
                { backgroundColor: Colors.primary100 },
              ]}
            >
              <Text style={styles.creditText}>
                {t("expert.browse.creditDot")} {creditBalance}{" "}
                {t("expert.browse.credits")}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.banner, { backgroundColor: bannerBg }]}>
          <MaterialIcons
            name={"info" as any}
            size={IconSize.inline}
            color={bannerText}
          />
          <Text style={[styles.bannerText, { color: bannerText }]}>
            {bannerMsg}
          </Text>
        </View>
        <View style={styles.centered}>
          <MaterialIcons
            name={emptyIcon as any}
            size={64}
            color={emptyIconColor}
          />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // VERIFIED STATE — normal feed
  const hasZones = serviceZones.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.verifyHeader}>
        <Text style={styles.subtitle}>{t("expert.browse.subtitle")}</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={1}>
              {primaryZoneName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.changeZoneBtn}
              onPress={() => zoneSheetRef.current?.present()}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={Icons.location as any}
                size={IconSize.inline}
                color={Colors.primary600}
              />
              <Text style={styles.changeZoneText}>
                {t("expert.browse.change")}
              </Text>
            </TouchableOpacity>
            <View style={styles.creditChip}>
              <Text style={styles.creditText}>
                ● {creditBalance} {t("expert.browse.credits")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category filter chips */}
      {hasZones && (
        <View style={styles.chipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            <TouchableOpacity
              onPress={() => handleCategorySelect(null)}
              style={[
                styles.chip,
                selectedCategoryId === null
                  ? styles.chipSelected
                  : styles.chipUnselected,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategoryId === null
                    ? styles.chipTextSelected
                    : styles.chipTextUnselected,
                ]}
              >
                {t("expert.browse.all")}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={[
                  styles.chip,
                  selectedCategoryId === cat.id
                    ? styles.chipSelected
                    : styles.chipUnselected,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategoryId === cat.id
                      ? styles.chipTextSelected
                      : styles.chipTextUnselected,
                  ]}
                >
                  {cat.nameEn ?? cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* No zone set */}
      {!hasZones ? (
        <View style={styles.centered}>
          <EmptyState
            icon={Icons.location}
            title={t("expert.browse.noZoneTitle")}
            subtitle={t("expert.browse.noZoneSubtitle")}
            action={{
              label: t("expert.browse.setZone"),
              onPress: () => zoneSheetRef.current?.present(),
            }}
          />
        </View>
      ) : feedLoading || zoneUpdating ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item: job }) => <BrowseJobCard job={job} t={t} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              icon={Icons.searchOff}
              title={t("expert.browse.emptyTitle")}
              subtitle={t("expert.browse.emptySubtitle")}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary600}
            />
          }
        />
      )}

      {/* Zone picker bottom sheet */}
      <BottomSheet ref={zoneSheetRef} snapPoints={["60%"]}>
        <Text style={styles.sheetTitle}>{t("expert.browse.selectZone")}</Text>
        <FlatList
          data={zones}
          keyExtractor={(z) => z.id}
          renderItem={({ item: zone, index }) => {
            const isSelected = serviceZones.some(
              (sz) => sz.zone.id === zone.id,
            );
            return (
              <View>
                <TouchableOpacity
                  style={styles.zoneRow}
                  onPress={() => handleZoneSelect(zone)}
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
                  {isSelected && (
                    <MaterialIcons
                      name="check"
                      size={IconSize.inline}
                      color={Colors.primary600}
                    />
                  )}
                </TouchableOpacity>
                {index < zones.length - 1 && (
                  <Divider style={styles.zoneDivider} />
                )}
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

function BrowseJobCard({
  job,
  t,
}: {
  job: BrowseJob;
  t: (key: string) => string;
}) {
  const dateStr = job.openedAt ?? job.createdAt ?? "";
  return (
    <Card
      variant={job.urgency === "EMERGENCY" ? "emergency" : "default"}
      style={styles.jobCard}
    >
      {/* Row 1: title + urgency pill */}
      <View style={styles.cardRow}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {job.title}
        </Text>
        <Pill
          label={getUrgencyLabel(job.urgency)}
          variant={getUrgencyVariant(job.urgency)}
        />
      </View>

      {/* Row 2: zone + time */}
      <Text style={styles.jobMeta}>
        {job.zone?.nameEn}
        {dateStr ? ` · ${formatRelativeTime(dateStr, "en")}` : ""}
      </Text>

      {/* Row 3: description */}
      {job.description ? (
        <Text style={styles.jobDesc} numberOfLines={2}>
          {job.description}
        </Text>
      ) : null}

      {/* Row 4: divider */}
      <Divider />

      {/* Row 5: homeowner trust block */}
      <Text style={styles.trustText}>
        {t("expert.browse.postedBy")} {job.homeowner?.firstName ?? "–"} · ★{" "}
        {job.homeowner?.positivePoints ?? 0} · {job.homeowner?.jobsPosted ?? 0}{" "}
        {t("expert.browse.jobs")}
      </Text>

      {/* CTA */}
      <Button
        label={t("expert.browse.placeBid")}
        onPress={() => router.push(`/(expert)/job/${job.id}` as any)}
        style={styles.bidBtn}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  loadingHeader: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  verifyHeader: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
  },
  title: {
    ...Typography.display,
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s3,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    flexShrink: 0,
  },
  changeZoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
  },
  changeZoneText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.primary600,
  },
  creditChip: {
    backgroundColor: Colors.primary100,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  creditText: {
    ...Typography.captionMd,
    color: Colors.primary600,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.s3,
  },
  emptyTitle: {
    ...Typography.heading2,
    textAlign: "center",
    color: Colors.gray600,
    marginTop: Spacing.s3,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: "center",
    color: Colors.gray400,
    maxWidth: 240,
  },
  errorText: {
    ...Typography.body,
    textAlign: "center",
  },
  retryBtn: {
    maxWidth: 160,
  },
  chipsRow: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  chipsContent: {
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s2,
    gap: Spacing.s2,
  },
  chip: {
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  chipSelected: {
    backgroundColor: Colors.primary600,
  },
  chipUnselected: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: Colors.white,
  },
  chipTextUnselected: {
    color: Colors.gray600,
  },
  listContent: {
    padding: Spacing.s4,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.s3,
  },
  jobCard: {
    gap: Spacing.s2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.s2,
  },
  jobTitle: {
    ...Typography.heading3,
    color: Colors.primary600,
    flex: 1,
  },
  jobMeta: {
    ...Typography.caption,
  },
  jobDesc: {
    ...Typography.body,
  },
  trustText: {
    ...Typography.caption,
    color: Colors.gray600,
  },
  bidBtn: {
    marginTop: Spacing.s1,
  },
  // Zone sheet
  sheetTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.s3,
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
