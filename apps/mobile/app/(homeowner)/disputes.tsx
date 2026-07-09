import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { disputesService } from "@/services/disputes.service";

interface DisputeJob {
  id: string;
  title: string;
  status: string;
}

interface Dispute {
  id: string;
  jobId: string;
  reason: string;
  description: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  job: DisputeJob;
}

function getDisputeStatus(dispute: Dispute): "OPEN" | "RESOLVED" {
  return dispute.resolvedAt ? "RESOLVED" : "OPEN";
}

export default function DisputesScreen() {
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await disputesService.getMyDisputes();
      setDisputes(res.data ?? []);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function reasonLabel(reason: string): string {
    return t(`homeowner.disputes.reasons.${reason}`, reason);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons
            name={Icons.back as any}
            size={24}
            color={Colors.gray900}
          />
        </TouchableOpacity>
        <Text style={styles.title}>{t("homeowner.disputes.title")}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <EmptyState
          icon="error"
          title={t("common.error")}
          subtitle={error}
          action={{ label: t("common.retry"), onPress: load }}
        />
      ) : disputes.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title={t("homeowner.disputes.empty")}
          subtitle={t("homeowner.disputes.emptySub")}
        />
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const status = getDisputeStatus(item);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push(
                    ("/(homeowner)/active-job/" + item.job.id) as any,
                  )
                }
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.jobTitle} numberOfLines={1}>
                    {item.job.title}
                  </Text>
                  <Pill
                    label={
                      status === "RESOLVED"
                        ? t("homeowner.disputes.statusResolved")
                        : t("homeowner.disputes.statusOpen")
                    }
                    variant={status === "RESOLVED" ? "success" : "warning"}
                  />
                </View>
                <Text style={styles.reasonText}>{reasonLabel(item.reason)}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    height: 56,
    gap: Spacing.s3,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.heading1,
    color: Colors.primary600,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: Spacing.s4,
  },
  separator: {
    height: Spacing.s3,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.s4,
    gap: Spacing.s2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.s2,
  },
  jobTitle: {
    ...Typography.heading3,
    flex: 1,
  },
  reasonText: {
    ...Typography.label,
    color: Colors.gray600,
  },
  description: {
    ...Typography.body,
    lineHeight: 20,
  },
  date: {
    ...Typography.caption,
  },
});
