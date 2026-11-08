import { categoryTile, filterIngredients, isLowStock, stockPercent, validateIngredient, type Ingredient } from "./inventory";

const ing = (o: Partial<Ingredient>): Ingredient => ({ id: "1", name: "Harina", unit: "kg", priceUsd: "2.5000", currentStock: "10", minStock: "5", category: null, ...o });

describe("isLowStock", () => {
  it("includes equal and zero", () => {
    expect(isLowStock(ing({ currentStock: "5" }))).toBe(true);
    expect(isLowStock(ing({ currentStock: "0", minStock: "0" }))).toBe(true);
    expect(isLowStock(ing({ currentStock: "5.1" }))).toBe(false);
  });
});

describe("stockPercent", () => {
  it("is relative to twice the minimum, clamped", () => {
    expect(stockPercent(5, 5)).toBe(50);
    expect(stockPercent(20, 5)).toBe(100);
    expect(stockPercent(0, 5)).toBe(0);
    expect(stockPercent(3, 0)).toBe(100);
    expect(stockPercent(0, 0)).toBe(0);
  });
});

describe("filterIngredients", () => {
  const list = [ing({ id: "a", name: "Tomate", category: "Verduras", currentStock: "1" }), ing({ id: "b", name: "Harina", category: "Secos" })];
  it("filters by search (accent-insensitive), low stock and category", () => {
    expect(filterIngredients(list, "TOMÁ", "all").map((i) => i.id)).toEqual(["a"]);
    expect(filterIngredients(list, "", "low").map((i) => i.id)).toEqual(["a"]);
    expect(filterIngredients(list, "", "Secos").map((i) => i.id)).toEqual(["b"]);
    expect(filterIngredients(list, "", "all")).toHaveLength(2);
  });
});

describe("categoryTile", () => {
  it("is stable per category and has a fallback", () => {
    expect(categoryTile("Lácteos")).toEqual(categoryTile("lácteos"));
    expect(categoryTile(null).icon).toBe("kitchen");
    expect(categoryTile("Carnes").icon).toBe("set-meal");
  });
  it("picks the icon from the ingredient name before the category", () => {
    expect(categoryTile("Secos", "TEST Aceite").icon).toBe("water-drop");
    expect(categoryTile("Secos", "TEST Harina de trigo").icon).toBe("bakery-dining");
    expect(categoryTile("Lácteos", "TEST Queso blanco").icon).toBe("egg");
    expect(categoryTile("Carnes", "TEST Carne molida").icon).toBe("set-meal");
    expect(categoryTile("Secos", "Sal").icon).toBe("grain");
    expect(categoryTile("Secos", "Tomate").icon).toBe("eco");
    expect(categoryTile("Secos", "Azúcar").icon).toBe("cake");
  });
  it("keeps the tile colors tied to the category only", () => {
    expect(categoryTile("Secos", "Aceite").colors).toEqual(categoryTile("Secos", "Harina").colors);
  });
  it("does not match keywords inside other words", () => {
    expect(categoryTile(null, "Espárrago").icon).toBe("kitchen");
    expect(categoryTile(null, "Salsa de tomate").icon).toBe("water-drop");
  });
});

describe("validateIngredient", () => {
  const ok = { name: "A", unit: "kg", priceUsd: "1,5", currentStock: "0", minStock: "2" };
  it("accepts valid input and parses decimal commas", () => {
    expect(validateIngredient(ok)).toEqual({});
  });
  it("reports Spanish errors per field", () => {
    const e = validateIngredient({ name: " ", unit: "", priceUsd: "0", currentStock: "-1", minStock: "x" });
    expect(Object.keys(e).sort()).toEqual(["currentStock", "minStock", "name", "priceUsd", "unit"]);
    expect(e.priceUsd).toBe("El precio debe ser mayor que 0");
  });
});
