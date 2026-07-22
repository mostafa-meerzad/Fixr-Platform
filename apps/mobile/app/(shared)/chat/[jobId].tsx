import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  MessageList,
  MessageInput,
  OverlayProvider,
} from 'stream-chat-react-native';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { chatService } from '@/services/chat.service';
import { jobsService, type JobStatus } from '@/services/jobs.service';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatJobData {
  id: string;
  title: string;
  status: JobStatus;
  homeowner: { id: string; name: string; avatarUrl: string | null };
  acceptedBid?: {
    expert: {
      user: { id: string; name: string; avatarUrl: string | null };
    };
  } | null;
}

interface ChatJobInfo {
  status: JobStatus;
  otherPartyName: string;
}

// ─── Stream theme (terra cotta warm cream) ───────────────────────────────────

const STREAM_THEME = {
  colors: {
    accent_blue: Colors.primary600,
    blue_alice: Colors.primary50,
    white_snow: Colors.bgApp,
    bg_gradient_start: Colors.bgApp,
    bg_gradient_end: Colors.bgApp,
    grey_whisper: Colors.bgApp,
  },
  messageList: {
    container: { backgroundColor: Colors.bgApp },
    listContainer: { backgroundColor: Colors.bgApp },
  },
  messageInput: {
    container: {
      backgroundColor: Colors.white,
      borderTopWidth: 1,
      borderTopColor: Colors.gray200,
      paddingVertical: Spacing.s2,
    },
    inputBoxContainer: {
      backgroundColor: Colors.gray100,
      borderRadius: Radius.full,
      borderWidth: 0,
    },
    inputBox: {
      color: Colors.gray900,
    },
  },
};

// ─── Date badge (neutral gray) ───────────────────────────────────────────────

function formatDateLabel(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (startOfDate.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfDate.getTime() === startOfYesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DateBadge({ label }: { label: string }) {
  return (
    <View style={dateBadgeStyles.container}>
      <Text style={dateBadgeStyles.text}>{label}</Text>
    </View>
  );
}

function CustomDateHeader({ dateString }: { dateString?: string | number }) {
  const label = useMemo(() => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? String(dateString) : formatDateLabel(d);
  }, [dateString]);
  return <DateBadge label={label} />;
}

function CustomInlineDateSeparator({ date }: { date?: Date }) {
  const label = useMemo(() => (date ? formatDateLabel(date) : ''), [date]);
  return <DateBadge label={label} />;
}

// ─── Avatar (terra cotta initials) ──────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

function ChatAvatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const fontSize = Math.round(size * 0.36);
  return (
    <View
      style={[
        avatarStyles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[avatarStyles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    color: Colors.white,
  },
});

// ─── Camera button (left side of input) ─────────────────────────────────────

function CameraInputButton() {
  return (
    <TouchableOpacity style={cameraStyles.btn} onPress={() => {}}>
      <MaterialIcons name={Icons.camera as any} size={IconSize.inline} color={Colors.gray400} />
    </TouchableOpacity>
  );
}

const cameraStyles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Screen states ─────────────────────────────────────────────────────────────

type ScreenState = 'loading' | 'forbidden' | 'error' | 'ready';

// ─── Status label i18n map ───────────────────────────────────────────────────

const STATUS_T_KEYS: Record<string, string> = {
  ASSIGNED:             'common.status.assigned',
  EN_ROUTE:             'common.status.enRoute',
  ARRIVED:              'common.status.arrived',
  IN_PROGRESS:          'common.status.inProgress',
  COMPLETION_REQUESTED: 'common.status.completionRequested',
  COMPLETED:            'common.status.completed',
  CANCELLED:            'common.status.cancelled',
  DISPUTED:             'common.status.disputed',
};

// ─── Header ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  onBack: () => void;
  title: string;
  jobInfo?: ChatJobInfo | null;
  isOtherOnline?: boolean;
}

function Header({ onBack, title, jobInfo, isOtherOnline }: HeaderProps) {
  const { t } = useTranslation();
  const hasJobInfo = jobInfo && jobInfo.otherPartyName;

  return (
    <View style={styles.header} accessibilityRole="header">
      <TouchableOpacity style={styles.backCircle} onPress={onBack}>
        <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
      </TouchableOpacity>

      {hasJobInfo ? (
        <>
          <ChatAvatar name={jobInfo.otherPartyName} size={40} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {jobInfo.otherPartyName}
            </Text>
            {isOtherOnline && (
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{t('shared.chat.onlineNow')}</Text>
              </View>
            )}
          </View>
          <Pill
            label={t(STATUS_T_KEYS[jobInfo.status] ?? 'common.status.assigned')}
            variant={getStatusVariant(jobInfo.status)}
            style={styles.statusPill}
          />
        </>
      ) : (
        <>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [channel, setChannel] = useState<any>(null);
  const [state, setState] = useState<ScreenState>('loading');
  const [kbHeight, setKbHeight] = useState(0);
  const [jobInfo, setJobInfo] = useState<ChatJobInfo | null>(null);
  const [isOtherOnline, setIsOtherOnline] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height + 20));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function fetchJobInfo() {
    try {
      const res = await jobsService.get(jobId);
      const job = res.data as ChatJobData;

      const isHomeowner = user?.role === 'HOMEOWNER';
      const otherPartyName = isHomeowner
        ? (job.acceptedBid?.expert?.user?.name ?? '')
        : (job.homeowner?.name ?? '');

      setJobInfo({ status: job.status, otherPartyName });
    } catch {
      // header falls back to plain title
    }
  }

  async function connect() {
    setState('loading');
    fetchJobInfo();

    try {
      const res = await chatService.getToken(jobId);
      const { token, channelId, channelType, apiKey } = res.data;

      const client = StreamChat.getInstance(apiKey);
      clientRef.current = client;

      await client.connectUser(
        { id: user!.id, name: user!.name },
        token,
      );

      const ch = client.channel(channelType, channelId);
      await ch.watch();

      const members = ch.state.members;
      const otherMember = Object.values(members).find(
        (m: any) => m.user?.id !== user?.id,
      );
      setIsOtherOnline((otherMember as any)?.user?.online ?? false);

      setChannel(ch);
      setState('ready');
    } catch (err: any) {
      const status: number = err?.response?.status ?? 0;
      if (status === 403) {
        setState('forbidden');
      } else {
        setState('error');
      }
    }
  }

  useEffect(() => {
    connect();
    return () => {
      clientRef.current?.disconnectUser().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} title={t('shared.chat.title')} jobInfo={jobInfo} isOtherOnline={isOtherOnline} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Forbidden (chat not yet unlocked) ──────────────────────────────────────

  if (state === 'forbidden') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} title={t('shared.chat.title')} />
        <EmptyState
          icon="chat-bubble"
          title={t('shared.chat.lockedTitle')}
          subtitle={t('shared.chat.lockedSubtitle')}
          action={{ label: t('common.back'), onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} title={t('shared.chat.title')} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button
            label={t('common.retry')}
            variant="secondary"
            onPress={connect}
            style={styles.retryBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  return (
    <OverlayProvider value={{ style: STREAM_THEME }}>
      <View style={styles.fullScreen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <Header
            onBack={() => router.back()}
            title={t('shared.chat.title')}
            jobInfo={jobInfo}
            isOtherOnline={isOtherOnline}
          />
        </SafeAreaView>

        {/* paddingBottom = keyboard height while open, safe-area inset when closed.
            Using Keyboard events directly avoids KeyboardAvoidingView's Android
            bug where it doesn't reset paddingBottom to 0 after dismissal. */}
        <View style={[styles.chatArea, { paddingBottom: kbHeight > 0 ? kbHeight : insets.bottom }]}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Chat client={clientRef.current as any}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Channel
              channel={channel as any}
              disableKeyboardCompatibleView
              DateHeader={CustomDateHeader}
              InlineDateSeparator={CustomInlineDateSeparator}
              InputButtons={CameraInputButton}
            >
              <MessageList />
              <MessageInput />
            </Channel>
          </Chat>
        </View>
      </View>
    </OverlayProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Non-chat states
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },

  // Chat ready state — full screen so OverlayProvider has correct bounds
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  headerSafe: {
    backgroundColor: Colors.white,
  },
  chatArea: {
    flex: 1,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
    // Force LTR layout regardless of device RTL system setting
    direction: 'ltr',
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray900,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success600,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.success600,
  },
  // Fallback when job info not yet loaded
  headerTitle: {
    flex: 1,
    ...Typography.heading1,
  },
  headerSpacer: {
    width: 32,
  },
  statusPill: {
    flexShrink: 0,
  },

  // ── Non-chat state helpers ──────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.s6,
    gap: Spacing.s4,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.s3,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  retryBtn: {
    width: 160,
  },
});

const dateBadgeStyles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.full,
    paddingVertical: Spacing.s1,
    paddingHorizontal: Spacing.s3,
    marginVertical: Spacing.s2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
});
