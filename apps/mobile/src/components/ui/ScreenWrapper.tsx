import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: Edge[];
  keyboardAvoiding?: boolean;
}

export function ScreenWrapper({
  children,
  scroll = false,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
  keyboardAvoiding = false,
}: ScreenWrapperProps) {
  // iOS scroll screens: automaticallyAdjustKeyboardInsets handles both the
  // content inset AND auto-scroll to the focused input — no KAV needed.
  // All other keyboardAvoiding cases: wrap with KAV + behavior="padding".
  const useNativeInsets = keyboardAvoiding && scroll && Platform.OS === 'ios';
  const useKAV = keyboardAvoiding && !useNativeInsets;

  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={useNativeInsets}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.inner, contentStyle]}>{children}</View>
  );

  const wrapped = useKAV ? (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
