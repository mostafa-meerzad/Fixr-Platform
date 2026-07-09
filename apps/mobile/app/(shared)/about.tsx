import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Divider } from "@/components/ui/Divider";

export default function AboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const handlePolicy = () => {
    Alert.alert(t("shared.about.privacyPolicy"), t("shared.about.comingSoon"));
  };

  const handleTerms = () => {
    Alert.alert(t("shared.about.terms"), t("shared.about.comingSoon"));
  };

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
        <Text style={styles.headerTitle}>{t("shared.about.title")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Brand block */}
        <View style={styles.brandCard}>
          <View style={styles.iconWrap}>
            <MaterialIcons
              name={"home-repair-service" as any}
              size={64}
              color={Colors.primary600}
            />
          </View>
          <Text style={styles.appName}>Fixr</Text>
          <Text style={styles.versionText}>
            {t("shared.about.versionLabel")} {version}
          </Text>
          <Text style={styles.description}>{t("shared.about.description")}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* Legal */}
        <View style={styles.legalCard}>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={handlePolicy}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLabel}>{t("shared.about.privacyPolicy")}</Text>
            <MaterialIcons
              name={Icons.chevronRight as any}
              size={20}
              color={Colors.gray400}
            />
          </TouchableOpacity>
          <Divider style={styles.legalDivider} />
          <TouchableOpacity
            style={styles.legalRow}
            onPress={handleTerms}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLabel}>{t("shared.about.terms")}</Text>
            <MaterialIcons
              name={Icons.chevronRight as any}
              size={20}
              color={Colors.gray400}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
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
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
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
  headerTitle: {
    ...Typography.heading1,
    color: Colors.primary600,
  },
  content: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s6,
    paddingBottom: Spacing.s6,
  },
  brandCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.s6,
    alignItems: "center",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.s4,
  },
  appName: {
    ...Typography.display,
    color: Colors.primary600,
    marginBottom: Spacing.s1,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.gray400,
    marginBottom: Spacing.s4,
  },
  description: {
    ...Typography.body,
    color: Colors.gray600,
    textAlign: "center",
    lineHeight: 22,
  },
  divider: {
    marginVertical: Spacing.s4,
  },
  legalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: "hidden",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: Spacing.s4,
  },
  legalLabel: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  legalDivider: {
    marginVertical: 0,
    marginHorizontal: Spacing.s4,
  },
  bottomPad: {
    height: Spacing.s6,
  },
});
