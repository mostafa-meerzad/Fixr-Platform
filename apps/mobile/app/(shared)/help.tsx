import React, { useState } from "react";
import {
  Linking,
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
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";

export default function HelpScreen() {
  const { t } = useTranslation();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const rawPhone = t("shared.help.phone").replace(/\s/g, "");

  const faqs: Array<{ q: string; a: string }> = [
    { q: t("shared.help.faq1Q"), a: t("shared.help.faq1A") },
    { q: t("shared.help.faq2Q"), a: t("shared.help.faq2A") },
    { q: t("shared.help.faq3Q"), a: t("shared.help.faq3A") },
    { q: t("shared.help.faq4Q"), a: t("shared.help.faq4A") },
  ];

  const toggleFaq = (idx: number) => {
    setExpandedFaq((prev) => (prev === idx ? null : idx));
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
        <Text style={styles.headerTitle}>{t("shared.help.title")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Contact us */}
        <Text style={styles.sectionLabel}>{t("shared.help.contactLabel")}</Text>
        <View style={styles.card}>
          <Button
            label={t("shared.help.whatsapp")}
            variant="secondary"
            leftIcon="chat"
            onPress={() =>
              Linking.openURL(`whatsapp://send?phone=${rawPhone}`)
            }
            style={styles.contactBtn}
          />
          <Button
            label={t("shared.help.call")}
            variant="secondary"
            leftIcon="phone"
            onPress={() => Linking.openURL(`tel:${rawPhone}`)}
          />
        </View>

        {/* Office */}
        <Text style={styles.sectionLabel}>{t("shared.help.officeLabel")}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <MaterialIcons
              name={"place" as any}
              size={18}
              color={Colors.primary600}
            />
            <Text style={styles.infoText}>{t("shared.help.address")}</Text>
          </View>
          <Divider style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <MaterialIcons
              name={"schedule" as any}
              size={18}
              color={Colors.primary600}
            />
            <Text style={styles.infoText}>{t("shared.help.hours")}</Text>
          </View>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionLabel}>{t("shared.help.faqLabel")}</Text>
        <View style={styles.card}>
          {faqs.map((faq, idx) => (
            <View key={idx}>
              <TouchableOpacity
                style={styles.faqRow}
                onPress={() => toggleFaq(idx)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <MaterialIcons
                  name={
                    (expandedFaq === idx
                      ? "expand-less"
                      : "expand-more") as any
                  }
                  size={20}
                  color={Colors.gray400}
                />
              </TouchableOpacity>
              {expandedFaq === idx && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
              {idx < faqs.length - 1 && <Divider style={styles.faqDivider} />}
            </View>
          ))}
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
    paddingBottom: Spacing.s6,
    gap: Spacing.s2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary600,
    letterSpacing: 0.72,
    textTransform: "uppercase",
    marginTop: Spacing.s4,
    marginBottom: Spacing.s2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.s4,
  },
  contactBtn: {
    marginBottom: Spacing.s3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    paddingVertical: Spacing.s2,
  },
  infoText: {
    ...Typography.bodyMd,
    color: Colors.gray900,
    flex: 1,
  },
  infoDivider: {
    marginVertical: 0,
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.s3,
    gap: Spacing.s2,
  },
  faqQuestion: {
    ...Typography.bodyMd,
    color: Colors.gray900,
    flex: 1,
  },
  faqAnswer: {
    ...Typography.body,
    color: Colors.gray600,
    lineHeight: 22,
    paddingBottom: Spacing.s3,
  },
  faqDivider: {
    marginVertical: 0,
  },
  bottomPad: {
    height: Spacing.s6,
  },
});
