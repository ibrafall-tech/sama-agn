import { describe, expect, it } from "vitest";
import { safeEqual, signSession, verifySession } from "@/lib/session";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const base = { pid: "p1", name: "Awa", admin: false, exp: Date.now() + 60_000 };

describe("session cookie", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession(base, SECRET);
    expect(await verifySession(token, SECRET)).toEqual(base);
  });

  it("rejects a tampered payload (for example someone making themselves admin)", async () => {
    const token = await signSession(base, SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, admin: true })).toString("base64url");
    expect(await verifySession(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects another secret, an expired session and garbage", async () => {
    const token = await signSession(base, SECRET);
    expect(await verifySession(token, SECRET + "x")).toBeNull();
    const old = await signSession({ ...base, exp: Date.now() - 1 }, SECRET);
    expect(await verifySession(old, SECRET)).toBeNull();
    expect(await verifySession("abc", SECRET)).toBeNull();
    expect(await verifySession(undefined, SECRET)).toBeNull();
  });
});

describe("safeEqual", () => {
  it("compares codes exactly", () => {
    expect(safeEqual("midi2026", "midi2026")).toBe(true);
    expect(safeEqual("midi2026", "midi2027")).toBe(false);
    expect(safeEqual("midi", "midi2026")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
