import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { authService } from "@/services/auth.service";
import { lookupService, type Zone } from "@/services/lookup.service";
import { useAuthStore } from "@/stores/auth.store";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";

type Step = "role" | "name" | "location";
type Role = "HOMEOWNER" | "EXPERT";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { phone, sessionId } = useLocalSearchParams<{
    phone: string;
    sessionId: string;
  }>();

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [selectedZone, setSelectedZone] = useState<{
    id: string;
    nameEn: string;
  } | null>(null);
  const [zoneError, setZoneError] = useState("");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lastNameRef = useRef<TextInput>(null);

  // Fetch zones when HOMEOWNER enters the name step
  useEffect(() => {
    if (step === "name" && role === "HOMEOWNER" && zones.length === 0) {
      setZonesLoading(true);
      lookupService
        .zones()
        .then(({ data }) => setZones(data))
        .catch(() =>
          toast.show({ message: t("common.error"), variant: "error" }),
        )
        .finally(() => setZonesLoading(false));
    }
  }, [step, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Step logic ---

  function handleRoleSelect(selected: Role) {
    setRole(selected);
  }

  function handleRoleContinue() {
    setStep("name");
  }

  function handleNameContinue() {
    if (!firstName.trim()) {
      setFirstNameError(t("auth.register.errorFirstName"));
      return;
    }
    setFirstNameError("");

    if (role === "HOMEOWNER") {
      let hasError = false;
      if (!selectedZone) {
        setZoneError(t("auth.register.errorZone"));
        hasError = true;
      } else {
        setZoneError("");
      }
      if (!address.trim()) {
        setAddressError(t("auth.register.errorAddress"));
        hasError = true;
      } else {
        setAddressError("");
      }
      if (hasError) return;
    }

    submitRegistration();
  }

  async function submitRegistration() {
    setSubmitting(true);
    try {
      const name = [firstName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(" ");
      const payload =
        role === "HOMEOWNER"
          ? {
              phone,
              name,
              role: "HOMEOWNER" as const,
              sessionId,
              zoneId: selectedZone!.id,
              address: address.trim(),
            }
          : { phone, name, role: "EXPERT" as const, sessionId };

      const { data } = await authService.register(payload);
      await setAuth(data.user, data.accessToken, data.refreshToken);

      if (role === "EXPERT") {
        router.replace("/(auth)/expert-onboarding/" as any);
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? t("auth.register.errorNetwork");
      toast.show({ message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step === "name") setStep("role");
  }

  // --- Progress bar values ---
  const progressStep = 1;
  const totalSteps = 1;

  // --- Render ---

  return (
    <ScreenWrapper scroll keyboardAvoiding>
      {/* ProgressBar at very top — only on name/location steps */}
      {step !== "role" && (
        <ProgressBar currentStep={progressStep} totalSteps={totalSteps} />
      )}

      <View style={styles.container}>
        {/* --- ROLE STEP --- */}
        {step === "role" && (
          <>
            <TouchableOpacity
              style={[styles.backBtn, { marginTop: Spacing.s4 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={Icons.back as any}
                size={24}
                color={Colors.gray600}
              />
            </TouchableOpacity>

            <View style={styles.roleHeader}>
              <Text style={styles.roleTitle}>
                {t("auth.register.roleTitle")}
              </Text>
              <Text style={styles.roleSubtitle}>
                {t("auth.register.roleSubtitle")}
              </Text>
            </View>

            <View style={styles.roleCards}>
              <RoleCard
                icon={Icons.tabHome}
                title={t("auth.register.homeownerTitle")}
                description={t("auth.register.homeownerDesc")}
                selected={role === "HOMEOWNER"}
                onPress={() => handleRoleSelect("HOMEOWNER")}
              />
              <RoleCard
                icon={Icons.handyman}
                title={t("auth.register.expertTitle")}
                description={t("auth.register.expertDesc")}
                selected={role === "EXPERT"}
                onPress={() => handleRoleSelect("EXPERT")}
              />
            </View>

            <View style={styles.disclaimerRow}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.gray400} />
              <Text style={styles.disclaimerText}>
                {t("auth.register.roleDisclaimer")}
              </Text>
            </View>

            <View style={styles.footer}>
              <Button
                label={t("auth.register.continue")}
                onPress={handleRoleContinue}
                variant="dark"
                disabled={role === null}
              />
            </View>
          </>
        )}

        {/* --- NAME STEP --- */}
        {step === "name" && (
          <>
            <TouchableOpacity
              style={[styles.backBtn, { marginTop: Spacing.s4 }]}
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={Icons.back as any}
                size={24}
                color={Colors.gray600}
              />
            </TouchableOpacity>

            <View style={styles.nameHeader}>
              <Text style={styles.nameTitle}>
                {role === "EXPERT"
                  ? t("auth.register.expertNameTitle")
                  : t("auth.register.homeownerNameTitle")}
              </Text>
              {role === "EXPERT" && (
                <Text style={styles.nameSubtitle}>
                  {t("auth.register.expertNameSubtitle")}
                </Text>
              )}
            </View>

            <View style={styles.fields}>
              <Input
                label={t("auth.register.firstNameLabel")}
                placeholder={t("auth.register.firstNamePlaceholder")}
                value={firstName}
                onChangeText={(v) => {
                  setFirstName(v);
                  setFirstNameError("");
                }}
                error={firstNameError}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
              <Input
                ref={lastNameRef}
                label={t("auth.register.lastNameLabel")}
                placeholder={t("auth.register.lastNamePlaceholder")}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                returnKeyType="done"
              />

              {/* Homeowner: zone + address on same screen */}
              {role === "HOMEOWNER" && (
                <>
                  <Text style={styles.locationSectionLabel}>
                    {t("auth.register.locationTitle")}
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {t("auth.register.zoneLabel")}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.zoneSelector,
                        zoneError ? styles.zoneSelectorError : null,
                      ]}
                      onPress={() => setZonePickerVisible(true)}
                      disabled={zonesLoading}
                    >
                      {zonesLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.gray400}
                        />
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.zoneSelectorText,
                              !selectedZone && styles.zoneSelectorPlaceholder,
                            ]}
                          >
                            {selectedZone?.nameEn ??
                              t("auth.register.zonePlaceholder")}
                          </Text>
                          <MaterialCommunityIcons
                            name={Icons.chevronDown as any}
                            size={20}
                            color={Colors.gray400}
                          />
                        </>
                      )}
                    </TouchableOpacity>
                    {zoneError ? (
                      <Text style={styles.fieldError}>{zoneError}</Text>
                    ) : null}
                  </View>

                  <Input
                    label={t("auth.register.addressLabel")}
                    placeholder={t("auth.register.addressPlaceholder")}
                    value={address}
                    onChangeText={(v) => {
                      setAddress(v);
                      setAddressError("");
                    }}
                    error={addressError}
                    multiline
                  />
                </>
              )}
            </View>

            {/* Expert hint note */}
            {role === "EXPERT" && (
              <View style={styles.expertHintRow}>
                <MaterialCommunityIcons name="information-outline" size={16} color={Colors.gray400} />
                <Text style={styles.expertHintText}>
                  {t("auth.register.expertNameHint")}
                </Text>
              </View>
            )}

            <View style={styles.footer}>
              <Button
                label={
                  role === "EXPERT"
                    ? t("auth.register.createAccount")
                    : t("auth.register.continue")
                }
                onPress={handleNameContinue}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          </>
        )}
      </View>

      {/* Zone picker modal */}
      <Modal
        visible={zonePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setZonePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setZonePickerVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t("auth.register.selectZoneTitle")}
            </Text>
            <FlatList
              data={zones}
              keyExtractor={(z) => z.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.zoneRow}
                  onPress={() => {
                    setSelectedZone({
                      id: item.id,
                      nameEn: item.nameEn ?? item.name,
                    });
                    setZoneError("");
                    setZonePickerVisible(false);
                  }}
                >
                  <Text style={styles.zoneRowText}>
                    {item.nameEn ?? item.name}
                  </Text>
                  {selectedZone?.id === item.id && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={Colors.primary600}
                    />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.zoneDivider} />}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// --- RoleCard sub-component ---

interface RoleCardProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function RoleCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: RoleCardProps) {
  return (
    <TouchableOpacity
      style={[styles.roleCard, selected && styles.roleCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[styles.roleIconBox, selected && styles.roleIconBoxSelected]}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={28}
          color={selected ? Colors.primary600 : Colors.gray400}
        />
      </View>
      <View style={styles.roleCardText}>
        <Text
          style={[
            styles.roleCardTitle,
            selected && styles.roleCardTitleSelected,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.roleCardDesc,
            selected && styles.roleCardDescSelected,
          ]}
        >
          {description}
        </Text>
      </View>
      <MaterialCommunityIcons
        name={selected ? "check-circle" : "radio-button-unchecked"}
        size={24}
        color={selected ? Colors.white : Colors.gray200}
      />
    </TouchableOpacity>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s6,
  },

  // Role step
  roleHeader: {
    marginTop: Spacing.s6,
    marginBottom: Spacing.s8,
    gap: Spacing.s2,
  },
  roleTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.gray900,
  },
  roleSubtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
  },
  roleCards: {
    gap: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  roleCardSelected: {
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary600,
  },
  roleIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconBoxSelected: {
    backgroundColor: Colors.white,
  },
  roleCardText: {
    flex: 1,
    gap: Spacing.s1,
  },
  roleCardTitle: {
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight as any,
    color: Colors.gray900,
  },
  roleCardTitleSelected: {
    color: Colors.white,
  },
  roleCardDesc: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray600,
  },
  roleCardDescSelected: {
    color: "rgba(255,255,255,0.85)",
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    backgroundColor: Colors.sand,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    borderRadius: Radius.md,
    marginBottom: Spacing.s4,
  },
  disclaimerText: {
    fontSize: 13,
    fontWeight: "400",
    color: Colors.gray600,
    flex: 1,
  },

  // Name step header
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  nameHeader: {
    marginTop: Spacing.s6,
    marginBottom: Spacing.s6,
    gap: Spacing.s1,
  },
  nameTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.gray900,
  },
  nameSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.gray600,
  },
  locationSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: Spacing.s2,
  },
  expertHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s2,
    backgroundColor: Colors.sand,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    borderRadius: Radius.md,
    marginBottom: Spacing.s4,
  },
  expertHintText: {
    fontSize: 13,
    fontWeight: "400",
    color: Colors.gray600,
    flex: 1,
  },

  // Fields
  fields: {
    gap: Spacing.s4,
    marginBottom: Spacing.s8,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.gray600,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.danger600,
  },

  // Zone selector
  zoneSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    height: 52,
    paddingHorizontal: Spacing.s4,
  },
  zoneSelectorError: {
    borderColor: Colors.danger600,
  },
  zoneSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    color: Colors.gray900,
  },
  zoneSelectorPlaceholder: {
    color: Colors.gray400,
  },

  // Footer
  footer: {
    marginTop: "auto",
  },

  // Zone picker modal
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.s6,
    paddingBottom: Spacing.s8,
    maxHeight: "70%",
  },
  sheetHandle: {
    width: 32,
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.full,
    alignSelf: "center",
    marginTop: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  sheetTitle: {
    fontSize: Typography.heading2.fontSize,
    fontWeight: Typography.heading2.fontWeight as any,
    color: Colors.gray900,
    marginBottom: Spacing.s4,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.s4,
    justifyContent: "space-between",
  },
  zoneRowText: {
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: Typography.bodyMd.fontWeight as any,
    color: Colors.gray900,
  },
  zoneDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
});
