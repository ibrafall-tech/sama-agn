import { describe, expect, it } from "vitest";
import { categoryFromWord, formatPrice, parseMenuText, sheetText, summarize } from "@/lib/menu";
import type { Order } from "@/lib/types";

describe("parseMenuText", () => {
  it("reads the usual WhatsApp formats", () => {
    const dishes = parseMenuText(`Thiéboudienne 2500
Yassa poulet - 2 000 F
Mafé : 2000f
- Dibi agneau 3.500 FCFA
Soupou kandja 2,5k`);
    expect(dishes).toEqual([
      { name: "Thiéboudienne", price: 2500, category: "Plat" },
      { name: "Yassa poulet", price: 2000, category: "Plat" },
      { name: "Mafé", price: 2000, category: "Plat" },
      { name: "Dibi agneau", price: 3500, category: "Plat" },
      { name: "Soupou kandja", price: 2500, category: "Plat" },
    ]);
  });

  it("switches category on section headers", () => {
    const dishes = parseMenuText("PLATS :\nCeebu jën 2500\n\nBoissons :\nBissap 500\nGingembre 500\nDesserts\nThiakry 700");
    expect(dishes.map((d) => [d.name, d.category])).toEqual([
      ["Ceebu jën", "Plat"],
      ["Bissap", "Boisson"],
      ["Gingembre", "Boisson"],
      ["Thiakry", "Dessert"],
    ]);
  });

  it("keeps a dish without price at 0 and skips blank lines and numbering", () => {
    expect(parseMenuText("1. Poulet braisé\n\n2) Frites 1000")).toEqual([
      { name: "Poulet braisé", price: 0, category: "Plat" },
      { name: "Frites", price: 1000, category: "Plat" },
    ]);
  });

  it("ignores the title line of a forwarded message", () => {
    const dishes = parseMenuText("Menu du jeudi – Chez Fatou\nThiébou yapp 2 500 F\nPoulet DG - 3000\n\nBoissons :\nBouye 500");
    expect(dishes.map((d) => [d.name, d.price, d.category])).toEqual([
      ["Thiébou yapp", 2500, "Plat"],
      ["Poulet DG", 3000, "Plat"],
      ["Bouye", 500, "Boisson"],
    ]);
  });

  it("does not take a digit inside the name for the price", () => {
    expect(parseMenuText("Menu 7up 500")).toEqual([{ name: "Menu 7up", price: 500, category: "Plat" }]);
  });
});

describe("categoryFromWord", () => {
  it("maps words with or without accents", () => {
    expect(categoryFromWord("Boissons")).toBe("Boisson");
    expect(categoryFromWord("Plats de résistance")).toBe("Plat");
    expect(categoryFromWord("Garnitures")).toBe("Accompagnement");
    expect(categoryFromWord("Thieb")).toBeNull();
  });
});

const order = (name: string, lines: [string, number, number][], note = ""): Order => ({
  id: name,
  personId: name,
  name,
  note,
  lines: lines.map(([n, price, qty]) => ({ dishId: n, name: n, price, qty })),
  total: lines.reduce((s, [, p, q]) => s + p * q, 0),
  createdBy: name,
  updatedAt: "",
});

describe("summarize", () => {
  const orders = [
    order("Moussa", [["Yassa", 2000, 1], ["Bissap", 500, 2]]),
    order("Awa", [["Yassa", 2000, 2]], "sans piment"),
    order("Binta", [["Mafé", 2500, 1]]),
  ];

  it("groups by dish, biggest first, and totals everything", () => {
    const s = summarize(orders);
    expect(s.dishes.map((d) => [d.name, d.qty, d.amount])).toEqual([
      ["Yassa", 3, 6000],
      ["Bissap", 2, 1000],
      ["Mafé", 1, 2500],
    ]);
    expect(s.total).toBe(9500);
    expect(s.items).toBe(6);
    expect(s.people.map((p) => p.name)).toEqual(["Awa", "Binta", "Moussa"]);
  });

  it("writes a sheet ready for WhatsApp", () => {
    const t = sheetText("mercredi 25 novembre", null, orders);
    expect(t).toContain("3 × Yassa");
    expect(t).toContain("• Awa : 2 × Yassa (sans piment) = 4 000 F");
    expect(t).toContain("*Total : 9 500 F* · 3 personnes");
  });
});

describe("formatPrice", () => {
  it("uses French grouping with plain spaces", () => {
    expect(formatPrice(12500)).toBe("12 500 F");
    expect(formatPrice(0)).toBe("0 F");
  });
});
