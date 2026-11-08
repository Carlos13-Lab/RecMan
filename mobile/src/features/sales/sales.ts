import { localDateString } from "../../shared/dates";
import { toNumber } from "../../shared/money";

export type SaleLike = {
  date: string;
  quantity: number;
  totalUsd: string;
  totalBs: string;
  createdAt: string;
  recipe?: { category: string | null; profitPercentage?: string } | null;
};

export const dayTotals = (sales: SaleLike[]) =>
  sales.reduce(
    (t, s) => ({ count: t.count + 1, units: t.units + s.quantity, usd: t.usd + toNumber(s.totalUsd), bs: t.bs + toNumber(s.totalBs) }),
    { count: 0, units: 0, usd: 0, bs: 0 },
  );

// First and last local day of a month (month is 0-based).
export const monthRange = (year: number, month: number) => ({
  from: localDateString(new Date(year, month, 1)),
  to: localDateString(new Date(year, month + 1, 0)),
});

// Whole Sunday-first weeks covering the month; days of neighbouring months are flagged.
export function monthGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = 1 - first.getDay();
  const end = last.getDate() + (6 - last.getDay());
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const d = new Date(year, month, start + i);
    return { date: localDateString(d), inMonth: d.getMonth() === month };
  });
}

export function perDayTotals(sales: SaleLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sales) out[s.date] = (out[s.date] ?? 0) + toNumber(s.totalUsd);
  return out;
}

// 0 = no sales; 1..5 = fifth of the month's best day that the day reaches.
export const heatLevel = (usd: number, max: number) => (usd > 0 && max > 0 ? Math.min(5, Math.ceil((usd * 5) / max)) : 0);

// Same approach as the backend dashboard: cost = revenue / (1 + profit%/100) with the recipe's CURRENT profit %.
export const estimatedProfit = (sales: SaleLike[]) =>
  sales.reduce((sum, s) => {
    if (!s.recipe) return sum;
    const rev = toNumber(s.totalUsd);
    return sum + rev - rev / (1 + toNumber(s.recipe.profitPercentage) / 100);
  }, 0);

export function monthKpis(sales: SaleLike[]) {
  const t = dayTotals(sales);
  const days = Object.entries(perDayTotals(sales));
  const best = days.reduce<[string, number] | null>((b, d) => (!b || d[1] > b[1] ? d : b), null);
  return {
    revenueUsd: t.usd,
    revenueBs: t.bs,
    units: t.units,
    count: t.count,
    sellingDays: days.length,
    avgPerSellingDay: days.length ? t.usd / days.length : 0,
    bestDay: best ? { date: best[0], usd: best[1] } : null,
  };
}

export function categoryBreakdown(sales: SaleLike[]) {
  const by = new Map<string, { usd: number; units: number }>();
  for (const s of sales) {
    const c = s.recipe?.category || "Sin categoría";
    const cur = by.get(c) ?? { usd: 0, units: 0 };
    by.set(c, { usd: cur.usd + toNumber(s.totalUsd), units: cur.units + s.quantity });
  }
  const total = [...by.values()].reduce((n, v) => n + v.usd, 0);
  return [...by.entries()]
    .map(([category, v]) => ({ category, ...v, sharePct: total > 0 ? (v.usd / total) * 100 : 0 }))
    .sort((a, b) => b.usd - a.usd);
}

// Change versus the previous period; null when there is nothing to compare with.
export const deltaPercent = (current: number, previous: number) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

// Weekday (0 = Sunday, from the local sale date) and local hour (from createdAt) with the most revenue.
export function bestTimes(sales: SaleLike[]) {
  const top = (m: Map<number, number>) => [...m.entries()].reduce<[number, number] | null>((b, e) => (!b || e[1] > b[1] ? e : b), null)?.[0];
  const wd = new Map<number, number>();
  const hr = new Map<number, number>();
  for (const s of sales) {
    const usd = toNumber(s.totalUsd);
    const [y, m, d] = s.date.split("-").map(Number);
    const w = new Date(y, m - 1, d).getDay();
    const h = new Date(s.createdAt).getHours();
    wd.set(w, (wd.get(w) ?? 0) + usd);
    hr.set(h, (hr.get(h) ?? 0) + usd);
  }
  const weekday = top(wd);
  const hour = top(hr);
  return weekday === undefined || hour === undefined ? null : { weekday, hour };
}

// Days of the cursor month that are comparable: today's day-of-month for the current month, all of a past month, none of a future one.
export function deltaSpan(cursor: { y: number; m: number }, now: Date): number {
  const key = cursor.y * 12 + cursor.m;
  const cur = now.getFullYear() * 12 + now.getMonth();
  if (key === cur) return now.getDate();
  return key < cur ? new Date(cursor.y, cursor.m + 1, 0).getDate() : 0;
}

// Sales whose day-of-month is <= cutoff.
export const sameSpan = <T extends { date: string }>(sales: T[], cutoff: number) => sales.filter((s) => Number(s.date.slice(8)) <= cutoff);
