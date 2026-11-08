import { initials, tileStyle } from "./tileStyle";

describe("initials", () => {
  it("takes the first letters of the first two words, uppercased", () => {
    expect(initials("pollo a la brasa")).toBe("PA");
    expect(initials("Arepa")).toBe("A");
    expect(initials("  ")).toBe("?");
  });
});

describe("tileStyle", () => {
  it("is stable per category (case-insensitive) and has a fallback", () => {
    expect(tileStyle("Postres")).toEqual(tileStyle("postres"));
    expect(tileStyle(null).icon).toBe("restaurant");
  });
});
