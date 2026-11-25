/**
 * Signed session cookie (HMAC-SHA256 via Web Crypto), usable both in the
 * Edge middleware and in Node route handlers. No session store needed.
 */
export type Session = { pid: string; name: string; admin: boolean; exp: number };

export const COOKIE = "cm_session";
export const SESSION_DAYS = 180;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET manquant ou trop court (32 caractères minimum).");
  }
  return "dev-only-secret-not-for-production-use-0000";
}

export async function signSession(session: Session, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(session)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null, secret: string, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64url(sig) as unknown as BufferSource,
      enc.encode(body),
    );
    if (!ok) return null;
    const s = JSON.parse(dec.decode(fromB64url(body))) as Partial<Session>;
    if (typeof s.pid !== "string" || typeof s.name !== "string" || typeof s.exp !== "number") return null;
    if (s.exp < now) return null;
    return { pid: s.pid, name: s.name, admin: s.admin === true, exp: s.exp };
  } catch {
    return null;
  }
}

/** Constant-time string comparison, so a wrong code takes as long as a right one. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function newExpiry(now = Date.now()): number {
  return now + SESSION_DAYS * 24 * 3600 * 1000;
}
