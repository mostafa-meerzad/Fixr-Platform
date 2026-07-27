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
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Colors,
  IconSize,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Avatar } from "@/components/ui/Avatar";
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

function getUrgencyVariant(urgency: string) {
  if (urgency === "EMERGENCY") return "danger" as const;
  if (urgency === "TODAY") return "warning" as const;
  return "gray" as const;
}

function getUrgencyLabel(urgency: string): string {
  if (urgency === "EMERGENCY") return "Emergency";
  if (urgency === "TODAY") return "Today";
  return "Scheduled";
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
    if (!loading && !error && !verificationStatus) {
      router.replace("/(auth)/expert-onboarding/selfie" as any);
    }
  }, [loading, error, verificationStatus]);

  if (loading || (!error && !verificationStatus)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.jobsInLabel}>{t("expert.browse.jobsIn")}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.zoneTitle}>–</Text>
          </View>
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
        <BrowseHeader
          jobsInLabel={t("expert.browse.jobsIn")}
          zoneName={primaryZoneName}
          creditBalance={creditBalance}
          creditsLabel={t("expert.browse.credits")}
          showChange={false}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // PENDING / REJECTED state
  if (verificationStatus === "PENDING" || verificationStatus === "REJECTED") {
    const isPending = verificationStatus === "PENDING";
    const bannerColor = isPending ? Colors.warning600 : Colors.danger600;
    const bannerBg = isPending ? Colors.warning100 : Colors.danger100;

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <BrowseHeader
          jobsInLabel={t("expert.browse.jobsIn")}
          zoneName={primaryZoneName}
          creditBalance={creditBalance}
          creditsLabel={t("expert.browse.credits")}
          showChange={false}
        />
        {/* Amber / danger verification banner */}
        <View style={[styles.pendingBanner, { backgroundColor: bannerBg }]}>
          <MaterialIcons
            name={isPending ? "hourglass-empty" : "cancel"}
            size={IconSize.inline}
            color={bannerColor}
          />
          <View style={styles.pendingBannerContent}>
            <Text style={[styles.pendingBannerTitle, { color: bannerColor }]}>
              {isPending
                ? t("expert.browse.pendingTitle")
                : t("expert.browse.rejectedTitle")}
            </Text>
            <Text
              style={[styles.pendingBannerSubtitle, { color: bannerColor }]}
            >
              {isPending
                ? t("expert.browse.pendingBannerSubtitle")
                : t("expert.browse.rejectedBanner")}
            </Text>
          </View>
        </View>
        {/* Empty feed state */}
        <View style={styles.centered}>
          <View style={styles.searchIconBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={40}
              color={Colors.gray400}
            />
          </View>
          <Text style={styles.pendingFeedTitle}>
            {t("expert.browse.pendingFeedTitle")}
          </Text>
          <Text style={styles.pendingFeedSubtitle}>
            {t("expert.browse.pendingFeedSubtitle")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // VERIFIED state — normal feed
  const hasZones = serviceZones.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <BrowseHeader
        jobsInLabel={t("expert.browse.jobsIn")}
        zoneName={primaryZoneName}
        creditBalance={creditBalance}
        creditsLabel={t("expert.browse.credits")}
        changeLabel={t("expert.browse.change")}
        showChange
        onChangePress={() => zoneSheetRef.current?.present()}
      />

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
                    <MaterialCommunityIcons
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

function BrowseHeader({
  jobsInLabel,
  zoneName,
  creditBalance,
  creditsLabel,
  changeLabel,
  showChange = false,
  onChangePress,
}: {
  jobsInLabel: string;
  zoneName: string;
  creditBalance: number;
  creditsLabel: string;
  changeLabel?: string;
  showChange?: boolean;
  onChangePress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.jobsInLabel}>{jobsInLabel}</Text>
      <View style={styles.headerRow}>
        <View style={styles.zoneChangeRow}>
          <Text style={styles.zoneTitle} numberOfLines={1}>
            {zoneName}
          </Text>
          {showChange && changeLabel ? (
            <TouchableOpacity onPress={onChangePress} activeOpacity={0.7}>
              <Text style={styles.changeLink}>{changeLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.creditsPill}>
          <MaterialCommunityIcons
            name={Icons.credit as any}
            size={14}
            color={Colors.amber}
          />
          <Text style={styles.creditsText}>
            {creditBalance} {creditsLabel}
          </Text>
        </View>
      </View>
    </View>
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
  const bidCount = job._count?.bids ?? 0;

  const metaParts = [
    job.zone?.nameEn,
    dateStr ? formatRelativeTime(dateStr, "en") : null,
    bidCount > 0 ? `${bidCount} ${t("expert.browse.bids")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      variant={job.urgency === "EMERGENCY" ? "emergency" : "default"}
      style={styles.jobCard}
    >
      {/* Row 1: urgency pill + zone/time/bids meta */}
      <View style={styles.cardTopRow}>
        <Pill
          label={getUrgencyLabel(job.urgency)}
          variant={getUrgencyVariant(job.urgency)}
        />
        <Text style={styles.jobMeta} numberOfLines={1}>
          {metaParts}
        </Text>
      </View>

      {/* Row 2: title */}
      <Text style={styles.jobTitle} numberOfLines={2}>
        {job.title}
      </Text>

      {/* Row 3: description (optional) */}
      {job.description ? (
        <Text style={styles.jobDesc} numberOfLines={2}>
          {job.description}
        </Text>
      ) : null}

      <Divider />

      {/* Row 4: homeowner trust + place bid button */}
      <View style={styles.cardBottomRow}>
        <View style={styles.trustRow}>
          <Avatar size={32} name={job.homeowner?.firstName} />
          <Text style={styles.trustText} numberOfLines={1}>
            {job.homeowner?.firstName ?? "–"} · +
            {job.homeowner?.positivePoints ?? 0} {t("expert.browse.points")} ·{" "}
            {job.homeowner?.jobsPosted ?? 0} {t("expert.browse.jobsPosted")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.placeBidBtn}
          onPress={() => router.push(`/(expert)/job/${job.id}` as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.placeBidText}>{t("expert.browse.placeBid")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingLeft: Spacing.s4,
    paddingRight: 56, // Spacing.s4 (16) + bell width (32) + gap (8) — clears the absolute bell overlay
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  jobsInLabel: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s3,
  },
  zoneChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    flex: 1,
  },
  zoneTitle: {
    ...Typography.display,
    flexShrink: 1,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primary600,
  },
  creditsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  creditsText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.amber,
  },

  // ── Pending banner ───────────────────────────────────────────────────────────
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
  },
  pendingBannerContent: {
    flex: 1,
    gap: 2,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  pendingBannerSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  searchIconBox: {
    width: 72,
    height: 72,
    backgroundColor: Colors.sand,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.s3,
  },
  pendingFeedTitle: {
    ...Typography.heading2,
    textAlign: "center",
    color: Colors.gray900,
  },
  pendingFeedSubtitle: {
    ...Typography.body,
    textAlign: "center",
    color: Colors.gray400,
    maxWidth: 260,
    marginTop: Spacing.s2,
  },

  // ── Category chips ───────────────────────────────────────────────────────────
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

  // ── Feed list ────────────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.s4,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.s3,
  },

  // ── Job card ─────────────────────────────────────────────────────────────────
  jobCard: {
    gap: Spacing.s2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s2,
  },
  jobMeta: {
    ...Typography.caption,
    flex: 1,
    textAlign: "right",
  },
  jobTitle: {
    ...Typography.heading3,
    color: Colors.gray900,
  },
  jobDesc: {
    ...Typography.body,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s2,
    marginTop: Spacing.s1,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    flex: 1,
  },
  trustText: {
    ...Typography.caption,
    color: Colors.gray600,
    flex: 1,
  },
  placeBidBtn: {
    backgroundColor: Colors.primary600,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s2,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBidText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.white,
  },

  // ── Shared states ────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.s6,
    gap: Spacing.s3,
  },
  errorText: {
    ...Typography.body,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: Colors.primary600,
    paddingHorizontal: Spacing.s6,
    paddingVertical: Spacing.s3,
    borderRadius: Radius.sm,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.white,
  },

  // ── Zone bottom sheet ────────────────────────────────────────────────────────
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
