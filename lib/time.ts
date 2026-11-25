/** The office runs on Dakar time (UTC+0, no daylight saving). */
export const TZ = "Africa/Dakar";

export function dateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(key: string, n: number): string {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isDateKey(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function longDate(key: string): string {
  return new Date(key + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

export function minutesNow(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Minutes left before "HH:MM" today; negative once passed; null without a deadline. */
export function minutesLeft(deadline: string, d: Date = new Date()): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(deadline || "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]) - minutesNow(d);
}

export function formatLeft(min: number): string {
  if (min <= 0) return "heure limite passée";
  if (min < 60) return `encore ${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return `encore ${h} h${r ? String(r).padStart(2, "0") : ""}`;
}

export function hhmm(deadline: string): string {
  return deadline ? deadline.replace(":", "h") : "";
}
