import { cookies } from "next/headers";
import { COOKIE, SESSION_DAYS, newExpiry, safeEqual, sessionSecret, signSession, verifySession, type Session } from "./session";

export function officeCode(): string {
  const c = process.env.OFFICE_CODE;
  if (c) return c;
  if (process.env.NODE_ENV === "production") throw new Error("OFFICE_CODE manquant");
  return "midi";
}

export function adminCode(): string {
  const c = process.env.ADMIN_CODE;
  if (c) return c;
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_CODE manquant");
  return "chef";
}

/** "admin", "member" or null for a wrong code. */
export function checkCode(code: string): "admin" | "member" | null {
  const isAdmin = safeEqual(code, adminCode());
  const isMember = safeEqual(code, officeCode());
  return isAdmin ? "admin" : isMember ? "member" : null;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE)?.value, sessionSecret());
}

export async function writeSession(s: Omit<Session, "exp">): Promise<Session> {
  const session: Session = { ...s, exp: newExpiry() };
  const jar = await cookies();
  jar.set(COOKIE, await signSession(session, sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return session;
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Slows down code guessing without blocking the event loop. */
export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
