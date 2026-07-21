import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";

import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/services/auth.service";
import { Colors, Spacing, Radius, IconSize } from "@/constants/theme";

const MIN_DIGITS = 9;
const MAX_DIGITS = 10;

export default function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const isValid = digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;

  function handleChange(text: string) {
    const numeric = text.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDigits(numeric);
  }

  async function handleContinue() {
    if (!isValid) return;
    const phone = `+93${digits}`;
    setLoading(true);
    try {
      await authService.sendOtp(phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? t("auth.phone.errorNetwork");
      toast.show({ message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.wordmark}>{t("auth.phone.wordmark")}</Text>
          <Text style={styles.tagline}>{t("auth.phone.tagline")}</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.heading}>{t("auth.phone.heading")}</Text>
          <Text style={styles.subtitle}>{t("auth.phone.subtitle")}</Text>

          <View style={styles.phoneRow}>
            <View style={styles.prefixPill}>
              <Text style={styles.flag}>🇦🇫</Text>
              <Text style={styles.prefixText}>+93</Text>
            </View>

            <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
              <Text
                style={[
                  styles.digitDisplay,
                  digits.length === 0 && styles.digitPlaceholder,
                ]}
                numberOfLines={1}
              >
                {digits.length > 0 ? digits : t("auth.phone.placeholder")}
              </Text>
              <TextInput
                value={digits}
                onChangeText={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                autoFocus
                caretHidden
                maxLength={MAX_DIGITS}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.hiddenInput}
              />
            </View>
          </View>

          <View style={styles.whatsappHint}>
            <MaterialIcons
              name="chat"
              size={IconSize.status}
              color={Colors.primary600}
            />
            <Text style={styles.hintText}>{t("auth.phone.whatsappHint")}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={t("auth.phone.continue")}
            onPress={handleContinue}
            variant="dark"
            disabled={!isValid}
            loading={loading}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s12,
    paddingBottom: Spacing.s6,
  },

  brandSection: {
    marginBottom: Spacing.s10,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.primary600,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.gray400,
    marginTop: Spacing.s1,
  },

  formSection: {},
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.gray900,
    marginBottom: Spacing.s1,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.gray600,
    marginBottom: Spacing.s4,
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    marginBottom: Spacing.s2,
  },
  prefixPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s1,
    backgroundColor: Colors.sand,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.md,
    height: 52,
  },
  flag: {
    fontSize: 18,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gray900,
  },
  inputBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: Spacing.s4,
  },
  inputBoxFocused: {
    borderColor: Colors.primary600,
    shadowColor: Colors.primary600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 0,
  },
  digitDisplay: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.gray900,
  },
  digitPlaceholder: {
    color: Colors.gray400,
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: "transparent",
  },

  whatsappHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "400",
    color: Colors.gray600,
  },

  footer: {
    position: "absolute",
    bottom: Spacing.s6,
    left: Spacing.s4,
    right: Spacing.s4,
  },
});
