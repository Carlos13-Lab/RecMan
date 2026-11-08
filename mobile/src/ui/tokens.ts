// Brand palette from the Stitch launcher icon spec: Indigo -> Purple gradient.
export const gradient = ["#6366F1", "#8B5CF6"] as const;
export const dark = { bg: "#141022", surface: "#121118", glassBorder: "rgba(255,255,255,0.14)", glass: "rgba(255,255,255,0.08)", text: "#ffffff", muted: "#a39fbd" };

export const colors = {
  primary: "#7c5ef3",
  background: "#f6f6f8",
  surface: "#ffffff",
  border: "#e4e2ee",
  text: "#121118",
  muted: "#696189",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray500: "#6b7280",
  gray400: "#9ca3af",
  success: "#07883b",
  danger: "#e73908",
};

export const radius = { lg: 8, xl: 12, xxl: 16, full: 9999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

// Tailwind shadow-sm
export const shadowSm = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

// Soft colored shadows (iOS color/opacity; Android only tints with elevation + shadowColor).
const glow = (color: string, opacity: number, radius: number, y: number, elevation: number) => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: y },
  elevation,
});
export const shadowPrimary = glow("#6366F1", 0.35, 14, 6, 8);
export const shadowGreen = glow("#16a34a", 0.18, 10, 4, 3);
export const shadowCard = glow("#7c5ef3", 0.1, 10, 3, 2);
