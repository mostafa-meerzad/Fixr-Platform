export const Colors = {
  // Primary (Terra Cotta / Burnt Sienna)
  primary600: "#B5432A",
  primary500: "#C96347",
  primary100: "#F5D4CC",
  primary50: "#FDF4F2",

  // Neutrals
  gray900: "#111827",
  gray600: "#4B5563",
  gray400: "#9CA3AF",
  gray200: "#E5E7EB",
  gray100: "#F3F4F6",
  white: "#FFFFFF",

  // Backgrounds
  bgApp: "#F7F0E5",
  bgCard: "#FFFFFF",

  // Semantic
  success600: "#16A34A",
  success100: "#DCFCE7",
  success700: "#1B3D10",
  warning600: "#D97706",
  warning100: "#FEF3C7",
  danger600: "#DC2626",
  danger100: "#FEE2E2",
  info600: "#2563EB",
  info100: "#DBEAFE",

  // Extended palette
  dark: "#1A1A1A",
  sand: "#E8DDD0",
  amber: "#E8A020",
} as const;

export const Typography = {
  display: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.primary600,
  },
  heading1: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.primary600,
  },
  heading2: { fontSize: 18, fontWeight: "600" as const, color: Colors.gray900 },
  heading3: { fontSize: 16, fontWeight: "600" as const, color: Colors.gray900 },
  body: { fontSize: 15, fontWeight: "400" as const, color: Colors.gray600 },
  bodyMd: { fontSize: 15, fontWeight: "500" as const, color: Colors.gray900 },
  label: { fontSize: 13, fontWeight: "500" as const, color: Colors.gray600 },
  labelBold: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.gray600,
  },
  caption: { fontSize: 12, fontWeight: "400" as const, color: Colors.gray400 },
  captionMd: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.gray400,
  },
} as const;

export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const IconSize = {
  tab: 26,
  btn: 20,
  inline: 18,
  status: 16,
  large: 40,
} as const;
