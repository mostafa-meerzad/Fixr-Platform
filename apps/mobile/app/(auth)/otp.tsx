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
import { Colors, Radius, Spacing } from "@/constants/theme";

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
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.gray600} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{t("auth.otp.title")}</Text>
          <Text style={styles.subtitle}>
            {t("auth.otp.sentTo")}{" "}
            <Text style={styles.phoneInline}>{phone}</Text>
            {" · "}
            <Text style={styles.wrongNumberLink} onPress={() => router.back()}>
              {t("auth.otp.wrongNumber")}
            </Text>
          </Text>
        </View>

        {/* 6 digit boxes */}
        <TouchableOpacity
          style={styles.boxesRow}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const isFilled = i < code.length;
            const isActive = i === code.length && !loading;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  isFilled && styles.boxFilled,
                  isActive && styles.boxActive,
                ]}
              >
                {loading && i === CODE_LENGTH - 1 ? (
                  <ActivityIndicator size="small" color={Colors.primary600} />
                ) : (
                  <Text style={styles.boxDigit}>{code[i] ?? ""}</Text>
                )}
              </View>
            );
          })}
        </TouchableOpacity>

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

        {/* Bottom footnote */}
        <Text style={styles.hint}>{t("auth.otp.hint")}</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s8,
    paddingBottom: Spacing.s6,
  },

  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.s6,
  },

  headerSection: {
    marginBottom: Spacing.s8,
    gap: Spacing.s2,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.gray900,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.gray400,
    lineHeight: 22,
  },
  phoneInline: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.gray900,
  },
  wrongNumberLink: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary600,
  },

  boxesRow: {
    flexDirection: "row",
    gap: Spacing.s2,
    marginBottom: Spacing.s4,
  },
  box: {
    flex: 1,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  boxActive: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    shadowColor: Colors.primary600,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 0,
  },
  boxDigit: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.gray900,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },

  resendRow: {
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  resendCountdown: {
    fontSize: 14,
    fontWeight: "400",
    color: Colors.gray400,
  },
  timerHighlight: {
    fontWeight: "700",
    color: Colors.gray900,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary600,
  },

  hint: {
    position: "absolute",
    bottom: Spacing.s6,
    left: Spacing.s4,
    right: Spacing.s4,
    fontSize: 12,
    fontWeight: "400",
    color: Colors.gray400,
    textAlign: "center",
  },
});
