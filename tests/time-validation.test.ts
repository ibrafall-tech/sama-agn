import { describe, expect, it } from "vitest";
import { addDays, dateKey, formatLeft, isDateKey, minutesLeft } from "@/lib/time";
import { menuSchema, orderSchema } from "@/lib/validation";

describe("dates (Dakar time)", () => {
  it("formats and shifts day keys", () => {
    expect(dateKey(new Date("2026-11-25T23:30:00Z"))).toBe("2026-11-25");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("validates day keys", () => {
    expect(isDateKey("2026-11-25")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("25/11/2026")).toBe(false);
  });

  it("counts down to the deadline", () => {
    const at = new Date("2026-11-25T10:48:00Z");
    expect(minutesLeft("11:30", at)).toBe(42);
    expect(minutesLeft("", at)).toBeNull();
    expect(formatLeft(42)).toBe("encore 42 min");
    expect(formatLeft(95)).toBe("encore 1 h35");
    expect(formatLeft(-3)).toBe("heure limite passée");
  });
});

describe("validation", () => {
  it("accepts a normal menu and coerces prices", () => {
    const r = menuSchema.parse({ restaurant: " Chez Fatou ", deadline: "11:30", dishes: [{ name: "Yassa", price: "2000" }] });
    expect(r.restaurant).toBe("Chez Fatou");
    expect(r.dishes[0]).toEqual({ name: "Yassa", price: 2000, category: "Plat" });
  });

  it("refuses an empty menu, a negative price or a bad time", () => {
    expect(menuSchema.safeParse({ dishes: [] }).success).toBe(false);
    expect(menuSchema.safeParse({ dishes: [{ name: "X", price: -5 }] }).success).toBe(false);
    expect(menuSchema.safeParse({ deadline: "25:00", dishes: [{ name: "X", price: 5 }] }).success).toBe(false);
  });

  it("limits quantities and the colleague id format", () => {
    const dishId = "7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b";
    expect(orderSchema.safeParse({ date: "2026-11-25", items: [{ dishId, qty: 2 }] }).success).toBe(true);
    expect(orderSchema.safeParse({ date: "2026-11-25", items: [{ dishId, qty: 500 }] }).success).toBe(false);
    expect(orderSchema.safeParse({ date: "2026-11-25", forId: "u_someone_else", items: [] }).success).toBe(false);
  });
});
