import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

type ToastVariant = 'default' | 'success' | 'error';

interface ToastConfig {
  message: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  show: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function variantIcon(variant: ToastVariant): string {
  if (variant === 'success') return 'check-circle-outline';
  if (variant === 'error') return 'alert-circle-outline';
  return 'information-outline';
}

function variantAccent(variant: ToastVariant): string {
  if (variant === 'success') return Colors.success600;
  if (variant === 'error') return Colors.danger600;
  return Colors.gray400;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ToastConfig>({ message: '', variant: 'default' });
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (newConfig: ToastConfig) => {
      if (timer.current) clearTimeout(timer.current);
      setConfig(newConfig);
      setVisible(true);
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -8, duration: 200, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }, 3000);
    },
    [opacity, translateY],
  );

  const variant = config.variant ?? 'default';
  const accent = variantAccent(variant);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { top: insets.top + Spacing.s2 },
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <MaterialCommunityIcons name={variantIcon(variant) as any} size={18} color={accent} style={styles.icon} />
          <Text style={styles.text} numberOfLines={2}>{config.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.s4,
    right: Spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray900,
    borderRadius: Radius.md,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    overflow: 'hidden',
    zIndex: 9999,
    ...Shadows.lg,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  icon: {
    marginRight: Spacing.s2,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
});
