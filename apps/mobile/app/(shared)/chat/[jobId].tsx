import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  MessageList,
  MessageComposer,
  OverlayProvider,
  WithComponents,
} from "stream-chat-react-native";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Icons } from "@/constants/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { chatService } from "@/services/chat.service";
import { jobsService, type JobStatus } from "@/services/jobs.service";
import { useAuthStore } from "@/stores/auth.store";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { buildStreamTheme } from "@/components/chat/streamTheme";

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD + INSET OWNERSHIP — read before touching layout here.
//
// Keyboard avoidance: Channel's built-in KeyboardCompatibleView handles it.
// keyboardVerticalOffset={insets.top + 64} tells it the height above the chat
// area (safe-area top + ChatHeader row) so it calculates push-up correctly.
// Do NOT add an external KeyboardAvoidingView — it creates two handlers that
// animate independently and produce a white-space gap on keyboard dismiss.
//
// Bottom inset: MessageComposer applies insets.bottom itself (BOTTOM_OFFSET in
// stream-chat-react-native-core). Do not add edges={["bottom"]} to the ready-
// state container and do not set messageComposer.wrapper.paddingBottom in the
// theme — the theme wrapper applies after the computed padding and overrides it.
//
// The loading / forbidden / error states have no composer, so they DO use
// edges={["bottom"]} on their SafeAreaView.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatJobData {
  id: string;
  title: string;
  status: JobStatus;
  homeowner: { id: string; name: string; avatarUrl: string | null };
  acceptedBid?: {
    id: string;
    price: number;
    expert: { user: { id: string; name: string; avatarUrl: string | null } };
  } | null;
}

interface JobInfo {
  otherPartyName: string;
  jobTitle: string;
}

type ScreenState = "loading" | "forbidden" | "error" | "ready";

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDateLabel(date: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  if (dateStart.getTime() === todayStart.getTime()) return "Today";
  if (dateStart.getTime() === yesterdayStart.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DatePill({ label }: { label: string }) {
  return (
    <View style={datePillStyles.wrap}>
      <Text style={datePillStyles.text}>{label}</Text>
    </View>
  );
}

function CustomDateHeader({ dateString }: { dateString?: string | number }) {
  const label = useMemo(() => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? String(dateString) : formatDateLabel(d);
  }, [dateString]);
  return <DatePill label={label} />;
}

function CustomInlineDateSeparator({ date }: { date?: Date }) {
  const label = useMemo(() => (date ? formatDateLabel(date) : ""), [date]);
  return <DatePill label={label} />;
}

const datePillStyles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    backgroundColor: Colors.sand,
    borderRadius: Radius.full,
    paddingVertical: Spacing.s1,
    paddingHorizontal: Spacing.s3,
    marginVertical: Spacing.s2,
  },
  text: { fontSize: 12, fontWeight: "600", color: Colors.gray600 },
});

// Defined once at module scope so the overrides object below stays referentially
// stable across renders.
const COMPONENT_OVERRIDES = {
  DateHeader: CustomDateHeader,
  InlineDateSeparator: CustomInlineDateSeparator,
} as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  // Select primitives, not the user object. Selecting `s.user` re-creates
  // `connect` whenever any field on the user changes, which tears down and
  // rebuilds the Stream connection.
  const userId = useAuthStore((s) => s.user?.id);
  const userName = useAuthStore((s) => s.user?.name);
  const isExpert = useAuthStore((s) => s.user?.role) === "EXPERT";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- StreamChat.getInstance() is generic over unspecified type params
  const clientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream Channel is generic over unspecified type params
  const [channel, setChannel] = useState<any>(null);
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [isOtherOnline, setIsOtherOnline] = useState(false);

  // See BOTTOM INSET OWNERSHIP above: if buildStreamTheme doesn't actually read
  // insets, drop the argument and this useMemo.
  const streamTheme = useMemo(() => buildStreamTheme(insets), [insets]);

  // ── Job info ────────────────────────────────────────────────────────────────

  const fetchJobInfo = useCallback(async () => {
    try {
      const res = await jobsService.get(jobId);
      const job = res.data as ChatJobData;
      const otherPartyName = isExpert
        ? (job.homeowner?.name ?? "")
        : (job.acceptedBid?.expert?.user?.name ?? "");
      setJobInfo({ otherPartyName, jobTitle: job.title ?? "" });
    } catch {
      // Header falls back to the generic title.
    }
  }, [jobId, isExpert]);

  // ── Stream connection ───────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!userId) return;

    setScreenState("loading");
    fetchJobInfo();

    try {
      const res = await chatService.getToken(jobId);
      const { token, channelId, channelType, apiKey } = res.data;

      const client = StreamChat.getInstance(apiKey);
      clientRef.current = client;

      // getInstance() is a singleton — reconnecting an already-connected user
      // throws a console warning and is wasted work.
      if (client.userID !== userId) {
        await client.connectUser({ id: userId, name: userName }, token);
      }

      const ch = client.channel(channelType, channelId);
      await ch.watch();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream ChannelMemberResponse
      const otherMember = Object.values(
        ch.state.members as Record<string, any>,
      ).find((m) => m.user?.id !== userId);
      setIsOtherOnline(otherMember?.user?.online ?? false);

      setChannel(ch);
      setScreenState("ready");
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios error shape
            ((err as any).response?.status ?? 0)
          : 0;
      setScreenState(status === 403 ? "forbidden" : "error");
    }
  }, [jobId, userId, userName, fetchJobInfo]);

  useEffect(() => {
    connect();
  }, [connect]);

  // Disconnect on unmount only — not on every `connect` identity change.
  useEffect(
    () => () => {
      clientRef.current?.disconnectUser().catch(() => {});
    },
    [],
  );

  // ── Non-ready states ────────────────────────────────────────────────────────

  if (screenState === "loading") {
    return (
      <SafeAreaView style={styles.nonChatSafe} edges={["bottom"]}>
        <ChatHeader
          onBack={() => router.back()}
          name={jobInfo?.otherPartyName}
          isOnline={isOtherOnline}
          isExpert={isExpert}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === "forbidden") {
    return (
      <SafeAreaView style={styles.nonChatSafe} edges={["bottom"]}>
        <ChatHeader onBack={() => router.back()} />
        <EmptyState
          icon={Icons.chatNone}
          title={t("shared.chat.lockedTitle")}
          subtitle={t("shared.chat.lockedSubtitle")}
          action={{ label: t("common.back"), onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  if (screenState === "error") {
    return (
      <SafeAreaView style={styles.nonChatSafe} edges={["bottom"]}>
        <ChatHeader onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("common.error")}</Text>
          <Button
            label={t("common.retry")}
            variant="secondary"
            onPress={connect}
            style={styles.retryBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Ready ───────────────────────────────────────────────────────────────────

  return (
    <OverlayProvider value={{ style: streamTheme }}>
      {/* Plain View, not SafeAreaView — MessageComposer owns insets.bottom. */}

      <View style={styles.screen}>
        <ChatHeader
          onBack={() => router.back()}
          name={jobInfo?.otherPartyName}
          isOnline={isOtherOnline}
          isExpert={isExpert}
        />

        <View style={styles.chatArea}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- StreamChat client generics */}
          <Chat client={clientRef.current as any}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream component override map */}
            <WithComponents overrides={COMPONENT_OVERRIDES as any}>
              <Channel
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream Channel generics
                channel={channel as any}
                keyboardVerticalOffset={insets.top + 64}
                // Text-only: nothing may open a picker or a recorder.
                hasImagePicker={false}
                hasFilePicker={false}
                audioRecordingEnabled={false}
                hideStickyDateHeader
              >
                {jobInfo?.jobTitle ? (
                  <View style={styles.jobPillRow}>
                    <View style={styles.jobPill}>
                      <Text style={styles.jobPillText}>
                        {t("shared.chat.about")}: {jobInfo.jobTitle}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <MessageList
                  additionalFlatListProps={{
                    keyboardShouldPersistTaps: "handled",
                    keyboardDismissMode: "on-drag",
                  }}
                />

                <MessageComposer />
              </Channel>
            </WithComponents>
          </Chat>
        </View>
      </View>
    </OverlayProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  nonChatSafe: { flex: 1, backgroundColor: Colors.bgApp },
  screen: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  chatArea: { flex: 1 },

  jobPillRow: {
    alignItems: "center",
  },
  jobPill: {
    backgroundColor: Colors.sand,
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing.s3,
  },
  jobPillText: { fontSize: 13, fontWeight: "600", color: Colors.gray600 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.s6,
    gap: Spacing.s4,
  },
  loadingText: { ...Typography.body, marginTop: Spacing.s3 },
  errorText: { ...Typography.body, textAlign: "center" },
  retryBtn: { width: 160 },
});
