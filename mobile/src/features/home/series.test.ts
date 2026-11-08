import { buildDailySeries, buildHourlySeries, smoothPath } from "./series";

describe("buildDailySeries", () => {
  it("returns 7 consecutive local days ending today, summing totalUsd strings per day and zero-filling gaps", () => {
    const sales = [
      { date: "2026-11-08", totalUsd: "10.50" },
      { date: "2026-11-08", totalUsd: "4.5000" },
      { date: "2026-11-05", totalUsd: "20" },
      { date: "2026-10-31", totalUsd: "99" }, // outside window
    ];
    const s = buildDailySeries(sales, new Date(2026, 10, 8, 23, 30));
    expect(s.map((p) => p.date)).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
    expect(s.map((p) => p.total)).toEqual([0, 0, 0, 20, 0, 0, 15]);
  });

  it("crosses month boundaries", () => {
    const s = buildDailySeries([], new Date(2026, 2, 3));
    expect(s[0].date).toBe("2026-02-25");
  });
});

describe("smoothPath", () => {
  it("starts with M at the first point and uses cubic segments", () => {
    const d = smoothPath([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);
    expect(d.startsWith("M0,10")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it("handles a single point", () => {
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M1,2");
  });
});

describe("buildHourlySeries", () => {
  const at = (h: number, m: number, usd: string) => ({ createdAt: new Date(2026, 10, 8, h, m).toISOString(), totalUsd: usd });

  it("buckets sales by local hour from 08:00 to the current hour, zero-filling gaps", () => {
    const s = buildHourlySeries([at(9, 5, "10"), at(9, 55, "5.5"), at(11, 0, "3")], new Date(2026, 10, 8, 12, 30));
    expect(s.map((p) => p.hour)).toEqual([8, 9, 10, 11, 12]);
    expect(s.map((p) => p.total)).toEqual([0, 15.5, 0, 3, 0]);
  });

  it("starts earlier when a sale happened before 08:00", () => {
    const s = buildHourlySeries([at(6, 10, "2")], new Date(2026, 10, 8, 10, 0));
    expect(s[0]).toEqual({ hour: 6, total: 2 });
    expect(s[s.length - 1].hour).toBe(10);
  });

  it("keeps at least 4 points early in the day and stops at 23", () => {
    expect(buildHourlySeries([], new Date(2026, 10, 8, 8, 0)).map((p) => p.hour)).toEqual([8, 9, 10, 11]);
    expect(buildHourlySeries([], new Date(2026, 10, 8, 23, 59)).pop()?.hour).toBe(23);
  });
});
