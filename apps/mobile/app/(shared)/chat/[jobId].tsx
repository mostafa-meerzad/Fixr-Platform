import React, { useEffect, useRef, useState } from 'react';
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
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { chatService } from '@/services/chat.service';
import { useAuthStore } from '@/stores/auth.store';

// ─── Stream theme override (teal) ────────────────────────────────────────────

const STREAM_THEME = {
  colors: {
    accent_blue: Colors.primary600,
  },
};

// ─── Screen states ────────────────────────────────────────────────────────────

type ScreenState = 'loading' | 'forbidden' | 'error' | 'ready';

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    // direction: 'ltr' prevents Android RTL system setting from mirroring the header
    <View style={styles.header}>
      <TouchableOpacity style={styles.backCircle} onPress={onBack}>
        <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray900} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
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

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height + 20));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function connect() {
    setState('loading');
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

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} title={t('shared.chat.title')} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Forbidden (chat not yet unlocked) ────────────────────────────────────────

  if (state === 'forbidden') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} title={t('shared.chat.title')} />
        <EmptyState
          icon="chat_bubble"
          title={t('shared.chat.lockedTitle')}
          subtitle={t('shared.chat.lockedSubtitle')}
          action={{ label: t('common.back'), onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

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

  // ── Chat ─────────────────────────────────────────────────────────────────────

  return (
    <OverlayProvider value={{ style: STREAM_THEME }}>
      <View style={styles.fullScreen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <Header onBack={() => router.back()} title={t('shared.chat.title')} />
        </SafeAreaView>

        {/* paddingBottom = keyboard height while open, safe-area inset when closed.
            Using Keyboard events directly avoids KeyboardAvoidingView's Android
            bug where it doesn't reset paddingBottom to 0 after dismissal. */}
        <View style={[styles.chatArea, { paddingBottom: kbHeight > 0 ? kbHeight : insets.bottom }]}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Chat client={clientRef.current as any}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Channel channel={channel as any} disableKeyboardCompatibleView>
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
    backgroundColor: Colors.white,
  },
  headerSafe: {
    backgroundColor: Colors.white,
  },
  chatArea: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    height: 56,
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
  },
  headerTitle: {
    flex: 1,
    ...Typography.heading1,
  },
  headerSpacer: {
    width: 32,
  },

  // ── Non-chat state helpers ───────────────────────────────────────────────────
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
