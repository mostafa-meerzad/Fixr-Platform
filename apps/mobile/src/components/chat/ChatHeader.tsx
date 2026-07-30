import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { Icons } from "@/constants/icons";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return (
    (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
  ).toUpperCase();
}

export interface ChatHeaderProps {
  onBack: () => void;
  name?: string | null;
  isOnline?: boolean;
  isExpert?: boolean;
}

export function ChatHeader({
  onBack,
  name,
  isOnline,
  isExpert,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name={Icons.back as any} // eslint-disable-line @typescript-eslint/no-explicit-any -- icon union too wide for string constant
            size={24}
            color={Colors.gray900}
          />
        </TouchableOpacity>

        {name ? (
          <>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{getInitials(name)}</Text>
              </View>
              <View
                style={[
                  styles.dot,
                  isOnline ? styles.dotOnline : styles.dotOffline,
                ]}
              />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                {/* verified shield shown for the expert's name when homeowner is viewing */}
                {!isExpert && (
                  <MaterialCommunityIcons
                    name={Icons.verified as any} // eslint-disable-line @typescript-eslint/no-explicit-any -- icon union too wide for string constant
                    size={14}
                    color={Colors.primary600}
                  />
                )}
              </View>
              <Text
                style={isOnline ? styles.statusOnline : styles.statusOffline}
              >
                {isOnline
                  ? t("shared.chat.onlineNow")
                  : t("shared.chat.offline")}
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
  },
  row: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
    direction: "ltr",
  },
  backBtn: {
    flexShrink: 0,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary600,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
  },
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  dotOnline: {
    backgroundColor: Colors.success600,
  },
  dotOffline: {
    backgroundColor: Colors.gray400,
  },
  nameBlock: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s1,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.gray900,
    flexShrink: 1,
  },
  statusOnline: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.success600,
  },
  statusOffline: {
    fontSize: 13,
    fontWeight: "400",
    color: Colors.gray400,
  },
});
