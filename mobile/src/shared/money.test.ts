import { formatBs, formatPercent, formatUsd, toNumber } from "./money";

describe("toNumber", () => {
  it("parses numeric strings from the API", () => {
    expect(toNumber("12.5000")).toBe(12.5);
  });
  it("passes numbers through", () => {
    expect(toNumber(7.25)).toBe(7.25);
  });
  it("falls back to 0 for null, undefined and garbage", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("abc")).toBe(0);
    expect(toNumber(NaN)).toBe(0);
  });
});

describe("formatUsd", () => {
  it("rounds unrounded values to 2 decimals with thousands separators", () => {
    expect(formatUsd(12450)).toBe("$12.450,00");
    expect(formatUsd(1234567.891)).toBe("$1.234.567,89");
    expect(formatUsd(0.005 + 0.1)).toBe("$0,11");
  });
  it("accepts API strings", () => {
    expect(formatUsd("12.5000")).toBe("$12,50");
  });
  it("handles negatives", () => {
    expect(formatUsd(-1500.5)).toBe("-$1.500,50");
  });
  it("does not show negative zero", () => {
    expect(formatUsd(-0.001)).toBe("$0,00");
  });
});

describe("formatBs", () => {
  it("prefixes Bs. and groups thousands", () => {
    expect(formatBs(450000)).toBe("Bs. 450.000,00");
    expect(formatBs("36.4")).toBe("Bs. 36,40");
  });
  it("handles negatives", () => {
    expect(formatBs(-10)).toBe("-Bs. 10,00");
  });
});

describe("formatPercent", () => {
  it("shows one decimal", () => {
    expect(formatPercent(58.2345)).toBe("58,2%");
    expect(formatPercent(0)).toBe("0,0%");
  });
});
