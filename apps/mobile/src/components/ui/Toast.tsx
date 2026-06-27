import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '@/constants/theme';

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ToastConfig>({ message: '' });
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (newConfig: ToastConfig) => {
      if (timer.current) clearTimeout(timer.current);
      setConfig(newConfig);
      setVisible(true);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 3000);
    },
    [opacity],
  );

  const borderColor =
    config.variant === 'success'
      ? Colors.success600
      : config.variant === 'error'
        ? Colors.danger600
        : undefined;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: insets.bottom + 80 },
            { opacity },
            borderColor ? { borderLeftWidth: 4, borderLeftColor: borderColor } : null,
          ]}
        >
          <Text style={styles.text}>{config.message}</Text>
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
    backgroundColor: Colors.gray900,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.s4,
    zIndex: 9999,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.white,
  },
});
