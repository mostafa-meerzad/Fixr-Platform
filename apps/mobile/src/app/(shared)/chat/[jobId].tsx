import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { chatService } from '../../../services/chat.service';
import { useAuthStore } from '../../../stores/auth.store';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';
import { useRTL } from '../../../hooks/useRTL';

// Stream Chat SDK — installed separately via: bun add stream-chat-react-native
// Lazy import so it doesn't crash if not installed
let StreamChat: any = null;
let Channel: any = null;
let MessageList: any = null;
let MessageInput: any = null;
try {
  const sc = require('stream-chat-react-native');
  StreamChat = sc.StreamChat;
  Channel = sc.Channel;
  MessageList = sc.MessageList;
  MessageInput = sc.MessageInput;
} catch {
  // package not installed yet
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAuthStore();

  const [chatClient, setChatClient] = useState<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!StreamChat) {
      setError('stream-chat-react-native not installed');
      return;
    }

    let client: any;

    async function initChat() {
      try {
        const res = await chatService.getToken(jobId);
        const { token, channelId, channelType, apiKey } = res.data.data;

        client = StreamChat.getInstance(apiKey);
        await client.connectUser({ id: user!.id, name: user!.name }, token);

        const ch = client.channel(channelType, channelId);
        await ch.watch();

        setChatClient(client);
        setChannel(ch);
      } catch (e: any) {
        setError(e?.message ?? t('error'));
      }
    }

    initChat();

    return () => {
      client?.disconnectUser?.();
    };
  }, [jobId]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text variant="h3">{t('openChat')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text variant="sm" color={Colors.danger} style={{ textAlign }}>{error}</Text>
        </View>
      ) : !chatClient || !channel ? (
        <View style={styles.errorContainer}>
          <Text variant="sm" muted style={{ textAlign }}>{t('loading')}</Text>
        </View>
      ) : (
        // Stream Chat UI components — rendered when SDK is installed
        <Channel client={chatClient} channel={channel}>
          <MessageList />
          <MessageInput />
        </Channel>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  back: { width: 40, alignItems: 'flex-start' },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
