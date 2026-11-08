import { parseQty, costBreakdown, filterRecipes, marginPercent, marginTone, priceFor, pricing, profitForMargin, salesStats, sortRecipes, validateRecipe } from "./recipes";

const line = (priceUsd: string, quantity: string, name = "x") => ({ ingredientId: name, name, unit: "kg", priceUsd, quantity });

describe("pricing", () => {
  it("matches the backend: cost = sum(price*qty), price = cost*(1+profit/100)", () => {
    const p = pricing([line("2.5", "2"), line("1", "0.5")], 60);
    expect(p.costUsd).toBeCloseTo(5.5);
    expect(p.priceUsd).toBeCloseTo(8.8);
    expect(p.profitUsd).toBeCloseTo(3.3);
    expect(p.marginPct).toBeCloseTo(37.5);
  });
  it("is all zeros with no lines and ignores unparseable quantities", () => {
    expect(pricing([], 50)).toEqual({ costUsd: 0, priceUsd: 0, profitUsd: 0, marginPct: 0 });
    expect(pricing([line("2", "abc")], 50).costUsd).toBe(0);
  });
});

describe("marginPercent / profitForMargin", () => {
  it("margin is profit over price", () => expect(marginPercent(10, 4)).toBeCloseTo(60));
  it("margin of a free recipe is 0", () => expect(marginPercent(0, 0)).toBe(0));
  it("profit % (markup) needed for a target margin", () => expect(profitForMargin(30)).toBeCloseTo(42.857, 2));
  it("priceFor applies the markup", () => expect(priceFor(10, 25)).toBe(12.5));
});

describe("marginTone", () => {
  it("green from 50, amber from 30, red below", () => {
    expect([marginTone(70), marginTone(50), marginTone(49.9), marginTone(30), marginTone(29.9)]).toEqual(["good", "good", "ok", "ok", "low"]);
  });
});

describe("validateRecipe", () => {
  const ok = { name: "Arepa", profit: "60", lines: [{ ingredientId: "a", quantity: "2" }] };
  it("accepts a valid recipe", () => expect(validateRecipe(ok)).toBeNull());
  it("requires a name (step 0)", () => expect(validateRecipe({ ...ok, name: "  " })).toEqual({ step: 0, message: "Escribe el nombre de la receta." }));
  it("rejects negative or non numeric profit (step 0)", () => {
    expect(validateRecipe({ ...ok, profit: "-1" })?.step).toBe(0);
    expect(validateRecipe({ ...ok, profit: "" })?.step).toBe(0);
  });
  it("needs an ingredient (step 1)", () => expect(validateRecipe({ ...ok, lines: [] })?.step).toBe(1));
  it("needs every quantity > 0 (step 1)", () => {
    expect(validateRecipe({ ...ok, lines: [{ ingredientId: "a", quantity: "0" }] })?.step).toBe(1);
    expect(validateRecipe({ ...ok, lines: [{ ingredientId: "a", quantity: "x" }] })?.step).toBe(1);
  });
  it("accepts a decimal comma", () => expect(validateRecipe({ ...ok, lines: [{ ingredientId: "a", quantity: "0,5" }] })).toBeNull());
});

describe("costBreakdown", () => {
  it("sorts by cost and computes shares of the total", () => {
    const b = costBreakdown([line("1", "1", "a"), line("3", "1", "b")]);
    expect(b.map((r) => r.name)).toEqual(["b", "a"]);
    expect(b.map((r) => r.sharePct)).toEqual([75, 25]);
    expect(b[0].costUsd).toBe(3);
  });
  it("returns shares of 0 when everything is free", () => expect(costBreakdown([line("0", "1")])[0].sharePct).toBe(0));
});

describe("salesStats", () => {
  const sales = [
    { quantity: 2, totalUsd: "10.5", recipe: { id: "r1" } },
    { quantity: 1, totalUsd: "4.5", recipe: { id: "r1" } },
    { quantity: 9, totalUsd: "99", recipe: { id: "r2" } },
    { quantity: 3, totalUsd: "1", recipe: null },
  ];
  it("sums units and revenue for one recipe only", () => expect(salesStats(sales, "r1")).toEqual({ units: 3, revenueUsd: 15 }));
  it("is zero when nothing sold", () => expect(salesStats(sales, "zz")).toEqual({ units: 0, revenueUsd: 0 }));
});

describe("filter and sort", () => {
  const r = (name: string, category: string | null, price: number, cost: number) => ({ id: name, name, category, priceUsd: price, costUsd: cost });
  const list = [r("Empanada", "Fritos", 10, 4), r("Hamburguesa", "Carnes", 10, 8), r("Árbol", null, 5, 1)];
  it("filters by accent-insensitive search and category", () => {
    expect(filterRecipes(list, "arbol", "all").map((x) => x.name)).toEqual(["Árbol"]);
    expect(filterRecipes(list, "", "Carnes").map((x) => x.name)).toEqual(["Hamburguesa"]);
  });
  it("sorts by name, best margin or worst margin", () => {
    expect(sortRecipes(list, "name").map((x) => x.name)).toEqual(["Árbol", "Empanada", "Hamburguesa"]);
    expect(sortRecipes(list, "margin-desc").map((x) => x.name)).toEqual(["Árbol", "Empanada", "Hamburguesa"]);
    expect(sortRecipes(list, "margin-asc").map((x) => x.name)).toEqual(["Hamburguesa", "Empanada", "Árbol"]);
  });
});

describe("parseQty", () => {
  it("accepts plain decimals with comma or dot", () => {
    expect(parseQty("0,5")).toBe(0.5);
    expect(parseQty("0.25")).toBe(0.25);
    expect(parseQty(" 12 ")).toBe(12);
  });
  // "1,000" is read as 1.0 with a comma decimal (not one thousand), which matches the field's decimal-comma convention.
  it("reads 1,000 as 1", () => expect(parseQty("1,000")).toBe(1));
  it.each(["1.000,5", "1,000.5", "1,5,3", "1e3", "abc", "", "0,1234", "1234567890"])("rejects %j", (s) => expect(parseQty(s)).toBe(0));
});
