import type { MaterialIcons } from "@expo/vector-icons";
import { toNumber } from "../../shared/money";

type Icon = keyof typeof MaterialIcons.glyphMap;

// GET /api/ingredients (entity numbers arrive as strings)
export type Ingredient = { id: string; name: string; unit: string; priceUsd: string; currentStock: string; minStock: string; category: string | null };
export type IngredientBody = { name: string; unit: string; priceUsd: number; currentStock: number; minStock: number; category?: string };
export type CategoryFilter = "all" | "low" | string;

// Unlike the server, 0 stock counts as low.
export const isLowStock = (i: Ingredient) => toNumber(i.currentStock) <= toNumber(i.minStock);

// Bar fill: the minimum sits at 50%, so "low" always reads as half-empty or less.
export function stockPercent(current: number, min: number): number {
  if (min <= 0) return current > 0 ? 100 : 0;
  return Math.min(Math.max((current / (min * 2)) * 100, 0), 100);
}

export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filterIngredients(list: Ingredient[], search: string, filter: CategoryFilter): Ingredient[] {
  const q = fold(search);
  return list.filter((i) => (!q || fold(i.name).includes(q)) && (filter === "all" || (filter === "low" ? isLowStock(i) : i.category === filter)));
}

// [gradient start, gradient end, icon color]
const PALETTE: (readonly [string, string, string])[] = [
  ["#eef0ff", "#e0e4ff", "#a5acfa"], ["#fff1e6", "#ffe4de", "#f4a58a"], ["#fff8df", "#ffefd1", "#e6c27a"],
  ["#e6fbf3", "#d4f9ec", "#86d9b4"], ["#f9ecfb", "#fbe6f1", "#d9a0e6"], ["#eef2f6", "#e6eaf0", "#aab4c3"],
];
const ICONS: [RegExp, Icon][] = [
  [/aceite|salsa|vinagre|liquido|bebida|jugo/, "water-drop"], [/carne|prote|pollo|pescado|marisco|embutido|jamon|tocino/, "set-meal"],
  [/lacteo|queso|leche|huevo|mantequilla|crema/, "egg"], [/verdura|vegetal|hortaliza|fruta|tomate|cebolla|papa|ajo|pimenton/, "eco"],
  [/especia|condimento|\bsal\b|pimienta|oregano/, "grain"], [/harina|cereal|grano|arroz|\bpan\b/, "bakery-dining"],
  [/dulce|postre|azucar|chocolate|miel/, "cake"], [/\bseco/, "inventory-2"],
];

// Pastel tile color comes from the category (stable per group); the icon prefers the ingredient name, then the category.
export function categoryTile(category: string | null, name = ""): { colors: readonly [string, string]; iconColor: string; icon: Icon } {
  const c = fold(category ?? "");
  const byText = (t: string) => ICONS.find(([re]) => re.test(t))?.[1];
  const ic = byText(fold(name)) ?? byText(c) ?? "kitchen";
  if (!c) return { colors: [PALETTE[5][0], PALETTE[5][1]], iconColor: PALETTE[5][2], icon: ic };
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const p = PALETTE[h % PALETTE.length];
  return { colors: [p[0], p[1]], iconColor: p[2], icon: ic };
}

// Accepts "1,5" or "1.5"; empty or garbage -> NaN.
// Plain decimals only (numeric(12,4)); anything else is NaN.
export const parseDecimal = (s: string) => (/^\d{1,8}([.,]\d{1,4})?$/.test(s.trim()) ? Number(s.trim().replace(",", ".")) : NaN);

export type FormValues = { name: string; unit: string; priceUsd: string; currentStock: string; minStock: string };
export type FormErrors = Partial<Record<keyof FormValues, string>>;

// Mirrors the backend rules: name/unit required, price > 0, stocks >= 0.
export function validateIngredient(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (!v.name.trim()) e.name = "Escribe el nombre";
  if (!v.unit.trim()) e.unit = "Indica la unidad";
  if (!(parseDecimal(v.priceUsd) > 0)) e.priceUsd = "El precio debe ser mayor que 0";
  if (!(parseDecimal(v.currentStock) >= 0)) e.currentStock = "Debe ser 0 o más";
  if (!(parseDecimal(v.minStock) >= 0)) e.minStock = "Debe ser 0 o más";
  return e;
}
