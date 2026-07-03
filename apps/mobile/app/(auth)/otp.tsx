import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";

import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);
  // Guard against double-submission when the useEffect fires
  const verifyingRef = useRef(false);

  // Countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === CODE_LENGTH && !verifyingRef.current) {
      verify(code);
    }
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(text: string) {
    if (loading) return;
    setCode(text.replace(/\D/g, "").slice(0, CODE_LENGTH));
  }

  async function verify(codeToCheck: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setLoading(true);
    try {
      const { data } = await authService.verifyOtp(phone, codeToCheck);
      const { sessionId, isNewUser } = data;

      if (isNewUser) {
        router.push({
          pathname: "/(auth)/register",
          params: { phone, sessionId },
        });
      } else {
        const { data: loginData } = await authService.login(phone, sessionId);
        await setAuth(
          loginData.user,
          loginData.accessToken,
          loginData.refreshToken,
        );
        router.replace("/");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? t("auth.otp.errorInvalid");
      toast.show({ message, variant: "error" });
      setCode("");
      verifyingRef.current = false;
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await authService.sendOtp(phone);
      setSecondsLeft(RESEND_SECONDS);
      setCode("");
      verifyingRef.current = false;
      toast.show({ message: t("auth.otp.resendSuccess"), variant: "success" });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? t("auth.otp.errorNetwork");
      toast.show({ message, variant: "error" });
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconBox}>
            <MaterialIcons
              name="smartphone"
              size={32}
              color={Colors.primary600}
            />
          </View>
          <Text style={styles.title}>{t("auth.otp.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.otp.subtitle")}</Text>
          <Text style={styles.phoneText}>{phone}</Text>
        </View>

        {/* 6-box code display */}
        <TouchableOpacity
          style={styles.boxesRow}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.box,
                i < code.length && styles.boxFilled,
                i === code.length && styles.boxActive,
              ]}
            >
              <Text style={styles.boxDigit}>{code[i] ?? ""}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* Hidden input captures keyboard */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          autoFocus
          caretHidden
          maxLength={CODE_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.hiddenInput}
        />

        {/* Loading indicator */}
        {loading && (
          <ActivityIndicator
            style={styles.loader}
            size="small"
            color={Colors.primary600}
          />
        )}

        {/* Resend row */}
        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={styles.resendCountdown}>
              {t("auth.otp.resendIn")}{" "}
              <Text style={styles.timerHighlight}>
                {formatTime(secondsLeft)}
              </Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendLink}>{t("auth.otp.resend")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom hint */}
        <Text style={styles.hint}>{t("auth.otp.hint")}</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s12,
    alignItems: "center",
  },

  // Header
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.s10,
    gap: Spacing.s2,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.s3,
  },
  title: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray400,
    textAlign: "center",
  },
  phoneText: {
    direction: "ltr",
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },

  // Code boxes
  boxesRow: {
    flexDirection: "row-reverse",
    gap: Spacing.s2,
    marginBottom: Spacing.s3,
    direction: "rtl",
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: {
    borderColor: Colors.primary600,
  },
  boxActive: {
    borderColor: Colors.primary600,
    shadowColor: Colors.primary600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  boxDigit: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.gray900,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },

  loader: {
    marginBottom: Spacing.s3,
  },

  // Resend
  resendRow: {
    marginBottom: Spacing.s6,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  resendCountdown: {
    fontSize: Typography.body.fontSize,
    color: Colors.gray400,
  },
  timerHighlight: {
    color: Colors.primary600,
    fontWeight: "600",
  },
  resendLink: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    color: Colors.primary600,
  },

  // Hint
  hint: {
    position: "absolute",
    bottom: Spacing.s6,
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.caption.fontWeight as any,
    color: Colors.gray400,
    textAlign: "center",
    paddingHorizontal: Spacing.s4,
  },
});
