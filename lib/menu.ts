import type { Category, Day, Order } from "./types";

export function formatPrice(n: number): string {
  return Math.round(n || 0).toLocaleString("fr-FR").replace(/ | /g, " ") + " F";
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function categoryFromWord(word: string): Category | null {
  const w = normalize(word).replace(/[^a-z ]/g, " ").trim();
  if (!w) return null;
  if (/\b(boissons?|jus|drinks?|rafraichissements?)\b/.test(w)) return "Boisson";
  if (/\b(desserts?|douceurs?)\b/.test(w)) return "Dessert";
  if (/\b(accompagnements?|garnitures?|extras?|supplements?)\b/.test(w)) return "Accompagnement";
  if (/\b(plats?|menu|resistance|principal|principaux)\b/.test(w)) return "Plat";
  return null;
}

const PRICE_RE = /(\d{1,3}(?:[ .  ]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|f|fr|frs|fcfa|cfa|xof)?\.?\s*$/i;

export type ParsedDish = { name: string; price: number; category: Category };

/**
 * Turns a menu pasted from WhatsApp into dishes. Understands lines such as
 * "Thiéboudienne 2500", "Yassa poulet - 2 000 F", "Bissap : 500f", "Mafé 2,5k"
 * and section headers such as "Boissons :".
 */
export function parseMenuText(text: string): ParsedDish[] {
  const out: ParsedDish[] = [];
  let category: Category = "Plat";
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim().replace(/^(\d+\s*[.)]\s+|[-*•·>]+\s*)/, "").trim();
    if (!line) continue;
    const m = PRICE_RE.exec(line);
    if (!m || m.index === 0) {
      const header = categoryFromWord(line.replace(/:$/, ""));
      const looksLikeHeader = /:$/.test(line) || (header !== null && line.split(/\s+/).length <= 3);
      if (header && looksLikeHeader) {
        category = header;
        continue;
      }
      // "Menu du jeudi – Chez Fatou", "Plats du jour" : a title, not a dish.
      if (header || /:$/.test(line)) continue;
      const name = cleanName(line);
      if (name) out.push({ name, price: 0, category });
      continue;
    }
    const unit = (m[2] || "").toLowerCase();
    let price: number;
    if (unit === "k") price = Math.round(parseFloat(m[1].replace(",", ".")) * 1000);
    else if (/[ .  ]\d{3}$/.test(m[1])) price = parseInt(m[1].replace(/[ .  ]/g, ""), 10);
    else price = Math.round(parseFloat(m[1].replace(",", ".")));
    const name = cleanName(line.slice(0, m.index));
    if (!name) continue;
    out.push({ name, price: Number.isFinite(price) ? price : 0, category });
  }
  return out;
}

function cleanName(s: string): string {
  const t = s.replace(/[\s:–—\-=.…|/]+$/, "").replace(/\s+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

export type DishTotal = { name: string; price: number; qty: number; amount: number };

export function summarize(orders: Order[]) {
  const byDish = new Map<string, DishTotal>();
  let total = 0;
  let items = 0;
  for (const o of orders) {
    for (const l of o.lines) {
      const key = normalize(l.name) + "|" + l.price;
      const cur = byDish.get(key) ?? { name: l.name, price: l.price, qty: 0, amount: 0 };
      cur.qty += l.qty;
      cur.amount += l.qty * l.price;
      byDish.set(key, cur);
      total += l.qty * l.price;
      items += l.qty;
    }
  }
  const dishes = [...byDish.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, "fr"));
  const people = [...orders].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { dishes, people, total, items };
}

export function linesLabel(o: Pick<Order, "lines">): string {
  return o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ");
}

/** Plain-text sheet for WhatsApp or the clipboard. */
export function sheetText(dateLabel: string, day: Day | null, orders: Order[]): string {
  const { dishes, people, total, items } = summarize(orders);
  const out: string[] = [`*Sama Agn* · ${dateLabel}`];
  if (day?.restaurant) out.push(`Restaurant : ${day.restaurant}`);
  if (day?.runnerName) out.push(`Récupérée par : ${day.runnerName}`);
  out.push("", `*À commander (${items})*`);
  for (const d of dishes) out.push(`${d.qty} × ${d.name}`);
  out.push("", "*Par personne*");
  for (const p of people) out.push(`• ${p.name} : ${linesLabel(p)}${p.note ? ` (${p.note})` : ""} = ${formatPrice(p.total)}`);
  out.push("", `*Total : ${formatPrice(total)}* · ${people.length} personne${people.length > 1 ? "s" : ""}`);
  return out.join("\n");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
