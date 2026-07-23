import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { useToast } from '@/components/ui/Toast';
import { chatService } from '@/services/chat.service';
import { jobsService, type JobStatus } from '@/services/jobs.service';
import { bidsService } from '@/services/bids.service';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatJobData {
  id: string;
  title: string;
  status: JobStatus;
  homeowner: { id: string; name: string; avatarUrl: string | null };
  acceptedBid?: {
    id: string;
    price: number;
    expert: {
      user: { id: string; name: string; avatarUrl: string | null };
    };
  } | null;
}

interface ChatJobInfo {
  status: JobStatus;
  otherPartyName: string;
}

interface BidActions {
  onAccept: () => void;
  onCounter: () => void;
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
  const label = React.useMemo(() => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? String(dateString) : formatDateLabel(d);
  }, [dateString]);
  return <DateBadge label={label} />;
}

function CustomInlineDateSeparator({ date }: { date?: Date }) {
  const label = React.useMemo(() => (date ? formatDateLabel(date) : ''), [date]);
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

// ─── Input buttons base (camera) ─────────────────────────────────────────────

function CameraButton() {
  return (
    <TouchableOpacity style={cameraStyles.btn} onPress={() => {}}>
      <MaterialCommunityIcons name={Icons.camera as any} size={IconSize.inline} color={Colors.gray400} />
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

// ─── Bid card (rendered in-thread for bid_card messages) ─────────────────────

interface BidCardMessageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  isExpert: boolean;
  actionsRef: React.RefObject<BidActions>;
}

function BidCardMessage({ message, isExpert, actionsRef }: BidCardMessageProps) {
  const { t } = useTranslation();
  const price: number = message?.bid_price ?? 0;
  const note: string = message?.bid_note ?? '';
  const arrival: string = message?.bid_arrival ?? '';

  return (
    <View style={bidCardStyles.wrapper}>
      <View style={bidCardStyles.card}>
        {/* Header */}
        <View style={bidCardStyles.headerRow}>
          <View style={bidCardStyles.headerIconWrap}>
            <MaterialCommunityIcons name="tag-outline" size={12} color={Colors.amber} />
          </View>
          <Text style={bidCardStyles.headerLabel}>
            {t('shared.chat.updatedBid')}
          </Text>
        </View>

        {/* Price + arrival row */}
        <View style={bidCardStyles.priceRow}>
          <View style={bidCardStyles.priceLeft}>
            <Text style={bidCardStyles.price}>
              {price.toLocaleString()}
              <Text style={bidCardStyles.priceCurrency}>₾</Text>
            </Text>
            {note ? <Text style={bidCardStyles.note}>{note}</Text> : null}
          </View>
          {arrival ? (
            <Text style={bidCardStyles.arrival}>{arrival}</Text>
          ) : null}
        </View>

        {/* Action buttons — homeowner only */}
        {!isExpert && (
          <>
            <View style={bidCardStyles.divider} />
            <View style={bidCardStyles.actions}>
              <TouchableOpacity
                style={[bidCardStyles.btn, bidCardStyles.acceptBtn]}
                onPress={() => actionsRef.current?.onAccept()}
                activeOpacity={0.8}
              >
                <Text style={bidCardStyles.acceptBtnText}>
                  {t('shared.chat.acceptBid')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bidCardStyles.btn, bidCardStyles.counterBtn]}
                onPress={() => actionsRef.current?.onCounter()}
                activeOpacity={0.8}
              >
                <Text style={bidCardStyles.counterBtnText}>
                  {t('shared.chat.counter')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const bidCardStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s2,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  headerIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: Colors.warning100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.s2,
    flexShrink: 1,
  },
  price: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.gray900,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.gray600,
  },
  note: {
    ...Typography.label,
    color: Colors.gray400,
  },
  arrival: {
    ...Typography.label,
    color: Colors.gray600,
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
    marginHorizontal: -Spacing.s4,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.primary600,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  counterBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
  },
  counterBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary600,
  },
});

// ─── Send-bid sheet (expert enters price before sending to thread) ─────────

interface SendBidSheetProps {
  visible: boolean;
  onClose: () => void;
  onSend: (price: number, note: string, arrival: string) => Promise<void>;
}

function SendBidSheet({ visible, onClose, onSend }: SendBidSheetProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [arrival, setArrival] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const parsed = parseInt(price.replace(/\D/g, ''), 10);
    if (!parsed || parsed <= 0) {
      toast.show({ message: t('shared.chat.priceRequired'), variant: 'error' });
      return;
    }
    setSending(true);
    try {
      await onSend(parsed, note.trim(), arrival.trim());
      setPrice('');
      setNote('');
      setArrival('');
      onClose();
    } catch {
      toast.show({ message: t('common.error'), variant: 'error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={sendBidStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[sendBidStyles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.s4) }]}>
        <View style={sendBidStyles.handle} />
        <Text style={sendBidStyles.title}>{t('shared.chat.sendBidTitle')}</Text>

        <Text style={sendBidStyles.fieldLabel}>{t('shared.chat.bidPrice')}</Text>
        <View style={sendBidStyles.priceInputRow}>
          <TextInput
            style={[sendBidStyles.input, { flex: 1 }]}
            placeholder="900"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
            placeholderTextColor={Colors.gray400}
          />
          <Text style={sendBidStyles.currencyBadge}>₾</Text>
        </View>

        <Text style={sendBidStyles.fieldLabel}>{t('shared.chat.bidNote')}</Text>
        <TextInput
          style={sendBidStyles.input}
          placeholder={t('shared.chat.bidNotePlaceholder')}
          value={note}
          onChangeText={setNote}
          placeholderTextColor={Colors.gray400}
        />

        <Text style={sendBidStyles.fieldLabel}>{t('shared.chat.bidArrival')}</Text>
        <TextInput
          style={sendBidStyles.input}
          placeholder={t('shared.chat.bidArrivalPlaceholder')}
          value={arrival}
          onChangeText={setArrival}
          placeholderTextColor={Colors.gray400}
        />

        <Button
          label={t('shared.chat.sendBid')}
          onPress={handleSend}
          loading={sending}
          style={sendBidStyles.sendBtn}
        />
      </View>
    </Modal>
  );
}

const sendBidStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.s6,
    paddingTop: Spacing.s3,
    gap: Spacing.s3,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray200,
    alignSelf: 'center',
    marginBottom: Spacing.s2,
  },
  title: {
    ...Typography.heading2,
    color: Colors.gray900,
    marginBottom: Spacing.s2,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.gray600,
    marginBottom: -Spacing.s1,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s4,
    ...Typography.bodyMd,
    color: Colors.gray900,
  },
  currencyBadge: {
    ...Typography.heading2,
    color: Colors.gray600,
  },
  sendBtn: {
    marginTop: Spacing.s2,
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
        <MaterialCommunityIcons name={Icons.back as any} size={24} color={Colors.gray900} />
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
  const toast = useToast();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const isExpert = user?.role === 'EXPERT';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [channel, setChannel] = useState<any>(null);
  const [state, setState] = useState<ScreenState>('loading');
  const [kbHeight, setKbHeight] = useState(0);
  const [jobInfo, setJobInfo] = useState<ChatJobInfo | null>(null);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [acceptedBidId, setAcceptedBidId] = useState<string | null>(null);
  const [bidSheetVisible, setBidSheetVisible] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState(false);

  // Stable ref for bid action callbacks (read from useMemo'd custom FlatList)
  const bidActionsRef = useRef<BidActions>({ onAccept: () => {}, onCounter: () => {} });

  // Update action callbacks each render so closures inside useMemo always call latest version
  bidActionsRef.current = {
    onAccept: async () => {
      const bidId = acceptedBidId;
      if (!bidId) return;
      setAcceptingBid(true);
      try {
        await bidsService.accept(jobId, bidId);
        toast.show({ message: t('shared.chat.bidAccepted'), variant: 'success' });
      } catch {
        toast.show({ message: t('common.error'), variant: 'error' });
      } finally {
        setAcceptingBid(false);
      }
    },
    onCounter: () => {
      // Dismiss so the homeowner can type a counter in the chat
    },
  };

  // Stable ref for opening the send-bid sheet (used inside useMemo'd InputButtons)
  const bidPressRef = useRef(() => {});
  bidPressRef.current = () => setBidSheetVisible(true);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height + 20));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function fetchJobInfo() {
    try {
      const res = await jobsService.get(jobId);
      const job = res.data as ChatJobData;

      const otherPartyName = isExpert
        ? (job.homeowner?.name ?? '')
        : (job.acceptedBid?.expert?.user?.name ?? '');

      setJobInfo({ status: job.status, otherPartyName });
      setAcceptedBidId(job.acceptedBid?.id ?? null);
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

  // ── Custom FlatList — intercepts bid_card messages ──────────────────────────
  // Created once so the component reference is stable (no unmount/remount churn).
  // Accesses dynamic data (role, actions) via refs captured at definition time.

  const CustomFlatList = useMemo(() => {
    const _isExpert = isExpert;
    const _actionsRef = bidActionsRef;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function FixrMessageFlatList({ renderItem, ...props }: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function patchedRenderItem(info: any) {
        const msg = info?.item?.message;
        if ((msg as any)?.fixr_type === 'bid_card') {
          return (
            <BidCardMessage
              message={msg}
              isExpert={_isExpert}
              actionsRef={_actionsRef}
            />
          );
        }
        return renderItem(info);
      }
      return <FlatList {...props} renderItem={patchedRenderItem} />;
    }

    return FixrMessageFlatList;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — uses stable refs and fixed isExpert

  // ── Custom InputButtons — adds bid button for expert ────────────────────────

  const CustomInputButtons = useMemo(() => {
    const _isExpert = isExpert;
    const _bidPressRef = bidPressRef;

    function FixrInputButtons() {
      return (
        <View style={inputBtnStyles.row}>
          <CameraButton />
          {_isExpert && (
            <TouchableOpacity
              style={inputBtnStyles.bidBtn}
              onPress={() => _bidPressRef.current()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="tag-outline"
                size={IconSize.inline}
                color={Colors.primary600}
              />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return FixrInputButtons;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — uses stable refs and fixed isExpert

  // ── Send bid card ───────────────────────────────────────────────────────────

  async function handleSendBidCard(price: number, note: string, arrival: string) {
    if (!channel) return;
    // Optionally update bid price via API if we have a bid ID
    if (acceptedBidId) {
      try {
        await bidsService.update(acceptedBidId, { price } as any);
      } catch {
        // Non-fatal — still post the card in chat
      }
    }
    await channel.sendMessage({
      text: '',
      fixr_type: 'bid_card',
      bid_id: acceptedBidId ?? '',
      bid_price: price,
      bid_note: note,
      bid_arrival: arrival,
      bid_job_id: jobId,
    });
  }

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

        <View style={[styles.chatArea, { paddingBottom: kbHeight > 0 ? kbHeight : insets.bottom }]}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Chat client={clientRef.current as any}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Channel
              channel={channel as any}
              disableKeyboardCompatibleView
              DateHeader={CustomDateHeader as any}
              InlineDateSeparator={CustomInlineDateSeparator as any}
              InputButtons={CustomInputButtons as any}
              FlatList={CustomFlatList as any}
            >
              <MessageList />
              <MessageInput />
            </Channel>
          </Chat>
        </View>

        {/* Send-bid sheet — only reachable for experts */}
        {isExpert && (
          <SendBidSheet
            visible={bidSheetVisible}
            onClose={() => setBidSheetVisible(false)}
            onSend={handleSendBidCard}
          />
        )}

        {/* Full-screen accept overlay */}
        {acceptingBid && (
          <View style={styles.acceptingOverlay}>
            <ActivityIndicator size="large" color={Colors.white} />
          </View>
        )}
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

  // ── Accepting overlay ───────────────────────────────────────────────────────
  acceptingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
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

const inputBtnStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
