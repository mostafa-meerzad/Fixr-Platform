export const Colors = {
  // Backgrounds
  bg: '#1a1a1a',
  bgCard: '#242424',
  bgCardAlt: '#2a2a2a',

  // Brand
  primary: '#2D9B6F',
  primaryLight: '#3DB87F',
  primaryMuted: 'rgba(45, 155, 111, 0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#6B6B6B',

  // Status badge colors
  statusEmergency: '#2D9B6F',       // green card bg
  statusEmergencyText: '#1a3d2e',
  statusToday: '#F5A623',           // warm orange
  statusTodayText: '#4a2f00',
  statusBidSent: '#F5DEB3',         // wheat
  statusBidSentText: '#4a3300',
  statusDone: '#3a3a3a',
  statusDoneText: '#A0A0A0',
  statusActive: '#2a3a2e',
  statusActiveText: '#2D9B6F',

  // UI
  border: '#333333',
  inputBg: '#2a2a2a',
  danger: '#E85D5D',
  warning: '#F5A623',
  success: '#2D9B6F',

  // Star rating
  star: '#F5A623',
  starEmpty: '#444444',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 42,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
