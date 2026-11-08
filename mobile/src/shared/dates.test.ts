import { localDateString } from "./dates";

describe("localDateString", () => {
  it("formats local calendar parts as YYYY-MM-DD with zero padding", () => {
    expect(localDateString(new Date(2026, 0, 5, 10, 30))).toBe("2026-01-05");
  });

  it("uses the local date late at night, not the UTC date", () => {
    // 23:59 local is always the same local day, whatever the UTC offset is.
    expect(localDateString(new Date(2026, 10, 8, 23, 59, 59))).toBe("2026-11-08");
  });

  it("uses the local date right after midnight", () => {
    expect(localDateString(new Date(2026, 11, 31, 0, 0, 1))).toBe("2026-12-31");
  });
});
