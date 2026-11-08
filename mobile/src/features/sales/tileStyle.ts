import type { MaterialIcons } from "@expo/vector-icons";

type Icon = keyof typeof MaterialIcons.glyphMap;
const PALETTE: (readonly [string, string])[] = [
  ["#6366F1", "#8B5CF6"], ["#f59e0b", "#ef4444"], ["#10b981", "#0ea5e9"], ["#ec4899", "#8b5cf6"], ["#f97316", "#facc15"], ["#14b8a6", "#6366F1"],
];
const ICONS: [RegExp, Icon][] = [
  [/postre|dulce|torta|helado/, "cake"], [/bebida|jugo|cafe|café|batido/, "local-cafe"], [/pan|panad|horne/, "bakery-dining"],
  [/ensalada|vegan|veget/, "eco"], [/sopa|caldo/, "ramen-dining"], [/pizza/, "local-pizza"], [/carne|pollo|parrilla/, "set-meal"],
];

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

// Same category -> same gradient and icon, so tiles read as groups without photos.
export function tileStyle(category: string | null): { colors: readonly [string, string]; icon: Icon } {
  const c = (category ?? "").trim().toLowerCase();
  if (!c) return { colors: PALETTE[0], icon: "restaurant" };
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { colors: PALETTE[h % PALETTE.length], icon: ICONS.find(([re]) => re.test(c))?.[1] ?? "restaurant" };
}
