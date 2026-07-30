import { StyleSheet } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";

interface Insets {
  top: number;
  bottom: number;
}

/**
 * Returns a Stream Chat theme object tuned for Fixr's warm-cream / terracotta palette.
 * Pass useSafeAreaInsets() result from the calling screen.
 *
 * Stream Chat v9 uses a `semantics` token layer for buttons and bubbles — the old
 * `colors.accent_blue` has no effect on them. The `semantics` overrides below are
 * the authoritative way to set send-button and bubble colors in this SDK version.
 */
export function buildStreamTheme(_insets: Insets) {
  return {
    // ── Legacy color tokens (some older SDK internals still read these) ──────
    colors: {
      white_snow: Colors.bgApp,
      bg_gradient_start: Colors.bgApp,
      bg_gradient_end: Colors.bgApp,
      grey_whisper: Colors.bgApp,
      grey: Colors.gray200,
      black: Colors.gray900,
      white: Colors.white,
    },

    // ── Semantic tokens (v9 buttons, bubbles, text — authoritative) ──────────
    semantics: {
      // Send button circle
      buttonPrimaryBg: Colors.primary600,
      buttonPrimaryTextOnAccent: Colors.white,

      // Own message (outgoing) bubble + body text
      chatBgOutgoing: Colors.primary600,
      chatBgAttachmentOutgoing: Colors.primary600,
      chatTextOutgoing: Colors.white,

      // Received message (incoming) bubble + body text
      chatBgIncoming: Colors.white,
      chatBgAttachmentIncoming: Colors.white,
      chatTextIncoming: Colors.gray900,

      // Timestamps appear on both sides; gray reads on white and is passable on
      // terracotta — Stream has no separate outgoing/incoming timestamp token.
      // (Design shows white timestamps on terracotta; not achievable without a
      // custom MessageFooter component since Stream uses a single shared token.)
      chatTextTimestamp: Colors.gray400,

      // General accent (read-receipt ticks, link colour, etc.)
      accentPrimary: Colors.primary600,
    },

    messageList: {
      container: { backgroundColor: Colors.bgApp },
      listContainer: { backgroundColor: Colors.bgApp },
    },

    messageComposer: {
      // paddingBottom intentionally absent — owned by Stream's BOTTOM_OFFSET.

      wrapper: {
        backgroundColor: Colors.white,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.gray200,
        paddingTop: Spacing.s4,
        paddingHorizontal: Spacing.s3,
        paddingBottom: Spacing.s5,
      },
      inputBoxWrapper: {
        backgroundColor: Colors.bgApp,
        borderRadius: Radius.xl,
        borderWidth: 0,
      },
      focusedInputBoxContainer: {
        borderWidth: 1.5,
        borderColor: Colors.primary600,
      },
    },
  };
}
