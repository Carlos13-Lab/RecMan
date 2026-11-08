import { localDateString } from "../../shared/dates";
import { toNumber } from "../../shared/money";

export type DayPoint = { date: string; total: number };

// Last `days` local days ending at `today`, summing totalUsd per date (zero-filled).
export function buildDailySeries(sales: { date: string; totalUsd: string | number }[], today: Date, days = 7): DayPoint[] {
  const totals = new Map<string, number>();
  for (const s of sales) totals.set(s.date, (totals.get(s.date) ?? 0) + toNumber(s.totalUsd));
  return Array.from({ length: days }, (_, i) => {
    const date = localDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i)));
    return { date, total: totals.get(date) ?? 0 };
  });
}

type Pt = { x: number; y: number };

// Smooth line through points: cubic segments with horizontal control handles (no overshoot).
export function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const mx = (a.x + b.x) / 2;
    d += ` C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
  }
  return d;
}

export type HourPoint = { hour: number; total: number };

// Today's sales bucketed by local hour: from 08:00 (or the earliest sale) to the current hour,
// padded to at least 4 points. createdAt is UTC ISO; getHours() gives the local hour.
export function buildHourlySeries(sales: { createdAt: string; totalUsd: string | number }[], now: Date): HourPoint[] {
  const totals = new Map<number, number>();
  for (const s of sales) {
    const h = new Date(s.createdAt).getHours();
    totals.set(h, (totals.get(h) ?? 0) + toNumber(s.totalUsd));
  }
  const hours = [...totals.keys()];
  const start = Math.min(8, now.getHours(), ...hours);
  const end = Math.min(23, Math.max(now.getHours(), start + 3, ...hours));
  return Array.from({ length: end - start + 1 }, (_, i) => ({ hour: start + i, total: totals.get(start + i) ?? 0 }));
}
