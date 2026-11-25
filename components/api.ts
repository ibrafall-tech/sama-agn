"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DayPayload } from "@/lib/types";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Pas de connexion. Réessayez dans un instant.", 0);
  }
  if (res.status === 401 && !url.startsWith("/api/session")) {
    window.location.href = "/login";
    throw new ApiError("Session expirée", 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || "Une erreur est survenue.", res.status);
  return data as T;
}

/** Day data, refreshed every 5 s while the app is visible, and on reconnect. */
export function useDay(date: string | null) {
  const [data, setData] = useState<DayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    try {
      const d = await api<DayPayload>(`/api/day${date ? `?date=${date}` : ""}`);
      if (n === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (n === seq.current) setError((e as Error).message);
    }
  }, [date]);

  useEffect(() => {
    setData(null);
    load();
    const tick = () => document.visibilityState === "visible" && load();
    const timer = setInterval(tick, 5000);
    const goOnline = () => {
      setOnline(true);
      load();
    };
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("midi:refresh", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("midi:refresh", load);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [load]);

  return { data, error, online, reload: load };
}

export function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}
