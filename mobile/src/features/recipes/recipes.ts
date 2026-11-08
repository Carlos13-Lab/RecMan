import { toNumber } from "../../shared/money";
import { fold } from "../inventory/inventory";

// One ingredient row of a recipe being priced (strings as they come from the API or the form).
export type Line = { ingredientId: string; name: string; unit: string; priceUsd: string; quantity: string };

// Same formula as the backend (src/shared/utils/recipe.utils.ts): price = cost * (1 + profit/100).
export const priceFor = (costUsd: number, profitPct: number) => costUsd * (1 + profitPct / 100);

// Gross margin = profit over sale price (not over cost).
export const marginPercent = (priceUsd: number, costUsd: number) => (priceUsd > 0 ? ((priceUsd - costUsd) / priceUsd) * 100 : 0);

// Profit % (markup over cost) that yields a given gross margin.
export const profitForMargin = (marginPct: number) => (marginPct / (100 - marginPct)) * 100;

// Accepts plain decimals like "0,5" or "0.5" (max numeric(12,3)); anything else is 0.
export const parseQty = (s: string) => (/^\d{1,9}([.,]\d{1,3})?$/.test(s.trim()) ? Number(s.trim().replace(",", ".")) : 0);

export const lineCost = (l: Pick<Line, "priceUsd" | "quantity">) => toNumber(l.priceUsd) * parseQty(l.quantity);

export function pricing(lines: Line[], profitPct: number) {
  const costUsd = lines.reduce((sum, l) => sum + lineCost(l), 0);
  const priceUsd = priceFor(costUsd, profitPct);
  return { costUsd, priceUsd, profitUsd: priceUsd - costUsd, marginPct: marginPercent(priceUsd, costUsd) };
}

export type MarginTone = "good" | "ok" | "low";
export const marginTone = (m: number): MarginTone => (m >= 50 ? "good" : m >= 30 ? "ok" : "low");
export const HEALTHY_MARGIN = 30;

// Mirrors the backend rules (zod schema) so the user hears about problems before the request.
export function validateRecipe(r: { name: string; profit: string; lines: { ingredientId: string; quantity: string }[] }): { step: 0 | 1; message: string } | null {
  if (!r.name.trim()) return { step: 0, message: "Escribe el nombre de la receta." };
  const profit = parseFloat(r.profit.replace(",", "."));
  if (!Number.isFinite(profit) || profit < 0) return { step: 0, message: "La ganancia debe ser 0 % o más." };
  if (r.lines.length === 0) return { step: 1, message: "Agrega al menos un ingrediente." };
  if (r.lines.some((l) => parseQty(l.quantity) <= 0)) return { step: 1, message: "Cada ingrediente necesita una cantidad mayor a 0." };
  return null;
}

// Each ingredient's cost and share of the recipe cost, most expensive first.
export function costBreakdown(lines: Line[]) {
  const rows = lines.map((l) => ({ id: l.ingredientId, name: l.name, unit: l.unit, quantity: parseQty(l.quantity), costUsd: lineCost(l) }));
  const total = rows.reduce((s, r) => s + r.costUsd, 0);
  return rows.map((r) => ({ ...r, sharePct: total > 0 ? (r.costUsd / total) * 100 : 0 })).sort((a, b) => b.costUsd - a.costUsd);
}

export function salesStats(sales: { quantity: number; totalUsd: string; recipe?: { id: string } | null }[], recipeId: string) {
  return sales.reduce((acc, s) => (s.recipe?.id === recipeId ? { units: acc.units + s.quantity, revenueUsd: acc.revenueUsd + toNumber(s.totalUsd) } : acc), { units: 0, revenueUsd: 0 });
}

type Row = { name: string; category: string | null; priceUsd: number; costUsd: number };
export function filterRecipes<T extends Row>(list: T[], search: string, category: string): T[] {
  const q = fold(search);
  return list.filter((r) => (!q || fold(r.name).includes(q)) && (category === "all" || r.category === category));
}

export type SortKey = "name" | "margin-desc" | "margin-asc";
export function sortRecipes<T extends Row>(list: T[], key: SortKey): T[] {
  const m = (r: T) => marginPercent(r.priceUsd, r.costUsd);
  const by: Record<SortKey, (a: T, b: T) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    "margin-desc": (a, b) => m(b) - m(a),
    "margin-asc": (a, b) => m(a) - m(b),
  };
  return [...list].sort(by[key]);
}
