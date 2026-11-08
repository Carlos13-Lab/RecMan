import { bestTimes, categoryBreakdown, deltaPercent, deltaSpan, sameSpan, dayTotals, estimatedProfit, heatLevel, monthGrid, monthKpis, monthRange, perDayTotals } from "./sales";

const at = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h, 15).toISOString();
const sale = (date: string, usd: string, o: Partial<{ quantity: number; bs: string; category: string | null; profit: string; createdAt: string }> = {}) => ({
  date,
  quantity: o.quantity ?? 1,
  totalUsd: usd,
  totalBs: o.bs ?? String(Number(usd) * 10),
  createdAt: o.createdAt ?? at(2026, 10, 1, 12),
  recipe: { category: o.category === undefined ? "Postres" : o.category, profitPercentage: o.profit ?? "100" },
});

describe("dayTotals", () => {
  it("sums count, units, usd and the stored bs", () => {
    expect(dayTotals([sale("2026-11-02", "10", { quantity: 2, bs: "400" }), sale("2026-11-02", "5.5", { bs: "230" })])).toEqual({ count: 2, units: 3, usd: 15.5, bs: 630 });
  });
  it("is zero for no sales", () => expect(dayTotals([])).toEqual({ count: 0, units: 0, usd: 0, bs: 0 }));
});

describe("monthRange / monthGrid", () => {
  it("gives local first and last day (month is 0-based)", () => {
    expect(monthRange(2026, 1)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange(2026, 9)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
  it("pads to whole Sunday-first weeks with adjacent days flagged", () => {
    const g = monthGrid(2026, 10); // Nov 1 2026 is a Sunday, Nov 30 a Monday
    expect(g.length % 7).toBe(0);
    expect(g[0]).toEqual({ date: "2026-11-01", inMonth: true });
    expect(g[g.length - 1]).toEqual({ date: "2026-12-05", inMonth: false });
    const oct = monthGrid(2026, 9); // Oct 1 is Thursday
    expect(oct[0]).toEqual({ date: "2026-09-27", inMonth: false });
    expect(oct[4]).toEqual({ date: "2026-10-01", inMonth: true });
  });
});

describe("perDayTotals / heatLevel", () => {
  it("sums usd per date", () => {
    expect(perDayTotals([sale("2026-11-02", "10"), sale("2026-11-02", "5"), sale("2026-11-03", "1")])).toEqual({ "2026-11-02": 15, "2026-11-03": 1 });
  });
  it("is 0 without sales and otherwise buckets 1..5 by share of the max", () => {
    expect(heatLevel(0, 100)).toBe(0);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(20, 100)).toBe(1);
    expect(heatLevel(21, 100)).toBe(2);
    expect(heatLevel(60, 100)).toBe(3);
    expect(heatLevel(80, 100)).toBe(4);
    expect(heatLevel(100, 100)).toBe(5);
    expect(heatLevel(5, 0)).toBe(0);
  });
});

describe("estimatedProfit", () => {
  it("is revenue minus revenue / (1 + margin/100), like the backend dashboard", () => {
    expect(estimatedProfit([sale("2026-11-02", "10", { profit: "100" })])).toBeCloseTo(5);
    expect(estimatedProfit([sale("2026-11-02", "30", { profit: "200" })])).toBeCloseTo(20);
  });
  it("counts a sale without recipe as zero cost knowledge (no profit)", () => {
    expect(estimatedProfit([{ ...sale("2026-11-02", "10"), recipe: null }])).toBe(0);
  });
});

describe("monthKpis", () => {
  it("aggregates revenue, units, best day and average per selling day", () => {
    const k = monthKpis([sale("2026-11-02", "10", { quantity: 2, bs: "100" }), sale("2026-11-02", "20", { bs: "200" }), sale("2026-11-04", "10", { bs: "100" })]);
    expect(k).toMatchObject({ revenueUsd: 40, revenueBs: 400, units: 4, count: 3, sellingDays: 2, avgPerSellingDay: 20, bestDay: { date: "2026-11-02", usd: 30 } });
  });
  it("handles an empty month", () => {
    expect(monthKpis([])).toMatchObject({ revenueUsd: 0, units: 0, sellingDays: 0, avgPerSellingDay: 0, bestDay: null });
  });
});

describe("categoryBreakdown", () => {
  it("groups by category, biggest first, with share and a fallback label", () => {
    const b = categoryBreakdown([sale("d", "30", { category: "Postres", quantity: 3 }), sale("d", "10", { category: null }), sale("d", "10", { category: "Postres" })]);
    expect(b).toEqual([
      { category: "Postres", usd: 40, units: 4, sharePct: 80 },
      { category: "Sin categoría", usd: 10, units: 1, sharePct: 20 },
    ]);
  });
});

describe("deltaPercent", () => {
  it("is the percent change versus the previous value", () => {
    expect(deltaPercent(112, 100)).toBeCloseTo(12);
    expect(deltaPercent(50, 100)).toBeCloseTo(-50);
  });
  it("is null when there is no previous value to compare with", () => {
    expect(deltaPercent(50, 0)).toBeNull();
    expect(deltaPercent(0, 0)).toBeNull();
  });
});

describe("bestTimes", () => {
  it("returns the weekday and local hour with the most revenue", () => {
    // 2026-11-02 Monday, 2026-11-03 Tuesday
    const t = bestTimes([
      sale("2026-11-02", "10", { createdAt: at(2026, 11, 2, 9) }),
      sale("2026-11-03", "30", { createdAt: at(2026, 11, 3, 13) }),
      sale("2026-11-03", "5", { createdAt: at(2026, 11, 3, 9) }),
      sale("2026-11-02", "10", { createdAt: at(2026, 11, 2, 9) }),
    ]);
    expect(t).toEqual({ weekday: 2, hour: 13 });
  });
  it("is null with no sales", () => expect(bestTimes([])).toBeNull());
});

describe("deltaSpan", () => {
  it("is today's day-of-month for the current month (Nov 8 -> 1..8)", () => {
    expect(deltaSpan({ y: 2026, m: 10 }, new Date(2026, 10, 8, 15))).toBe(8);
  });
  it("is the full month length for past months", () => {
    expect(deltaSpan({ y: 2026, m: 9 }, new Date(2026, 10, 8))).toBe(31);
    expect(deltaSpan({ y: 2026, m: 1 }, new Date(2026, 10, 8))).toBe(28);
  });
  it("is 0 for future months", () => {
    expect(deltaSpan({ y: 2026, m: 11 }, new Date(2026, 10, 8))).toBe(0);
    expect(deltaSpan({ y: 2027, m: 0 }, new Date(2026, 10, 8))).toBe(0);
  });
});

describe("sameSpan", () => {
  const oct = [sale("2026-10-01", "1"), sale("2026-10-08", "2"), sale("2026-10-09", "4"), sale("2026-10-31", "8")];
  it("keeps sales up to the cutoff day, inclusive", () => {
    expect(sameSpan(oct, 8).map((s) => s.date)).toEqual(["2026-10-01", "2026-10-08"]);
  });
  it("Mar 31 vs Feb: cutoff 28 keeps the whole of February", () => {
    const feb = [sale("2026-02-01", "1"), sale("2026-02-28", "2")];
    expect(sameSpan(feb, Math.min(31, 28))).toHaveLength(2);
  });
  it("keeps everything for a full-month cutoff and nothing for 0", () => {
    expect(sameSpan(oct, 31)).toHaveLength(4);
    expect(sameSpan(oct, 0)).toHaveLength(0);
  });
});
