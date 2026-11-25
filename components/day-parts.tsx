"use client";
import { useEffect, useState } from "react";
import { formatPrice, initials } from "@/lib/menu";
import { formatLeft, hhmm, minutesLeft } from "@/lib/time";
import { CATEGORIES, type DayPayload, type Dish } from "@/lib/types";
import { api, vibrate } from "./api";
import { IconClock } from "./icons";
import { toast } from "./toast";

export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function StatusPill({ data }: { data: DayPayload }) {
  const now = useNow();
  const day = data.day;
  if (!day) return null;
  if (day.closed) return <span className="pill pill-closed">Commandes clôturées</span>;
  const left = data.date === data.today ? minutesLeft(day.deadline, now) : null;
  if (left !== null && left <= 0) return <span className="pill pill-late">Heure limite passée</span>;
  return <span className="pill pill-open">Commandes ouvertes</span>;
}

/** Restaurant, deadline countdown and who is going: the three things people ask every day. */
export function StatusCard({ data, onChanged }: { data: DayPayload; onChanged: () => void }) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const day = data.day;
  if (!day) return null;
  const left = data.date === data.today ? minutesLeft(day.deadline, now) : null;
  const iAmRunner = day.runnerPid === data.me.pid;

  async function runner(action: "claim" | "release") {
    setBusy(true);
    try {
      await api(`/api/day?date=${data.date}`, { method: "PATCH", json: { runner: action } });
      vibrate();
      toast(action === "claim" ? "C'est noté, tu vas chercher les repas" : "Tu n'y vas plus");
      onChanged();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card status" aria-label="Infos du jour">
      <div className="status-top">
        <div style={{ minWidth: 0 }}>
          <StatusPill data={data} />
          <p className="resto">{day.restaurant || "Restaurant du jour"}</p>
        </div>
        {day.deadline && (
          <div className="deadline">
            <div className="row muted small" style={{ gap: 4, justifyContent: "flex-end" }}><IconClock /> avant</div>
            <b className="num">{hhmm(day.deadline)}</b>
            {left !== null && left > 0 && !day.closed && <div className="muted small num">{formatLeft(left)}</div>}
          </div>
        )}
      </div>
      <div className="runner">
        {day.runnerName ? (
          <div className="runner-who">
            <span className="avatar" aria-hidden>{initials(day.runnerName)}</span>
            <span><b>{iAmRunner ? "Tu y vas" : day.runnerName}</b> <span className="muted">{iAmRunner ? "aujourd'hui" : "va chercher les repas"}</span></span>
          </div>
        ) : (
          <span className="muted">Personne n&apos;y va encore</span>
        )}
        {!day.runnerPid && (
          <button className="btn btn-sm btn-sun" type="button" disabled={busy} onClick={() => runner("claim")}>J&apos;y vais</button>
        )}
        {iAmRunner && (
          <button className="btn btn-sm btn-ghost" type="button" disabled={busy} onClick={() => runner("release")}>Je n&apos;y vais plus</button>
        )}
      </div>
    </section>
  );
}

export type Cart = Record<string, number>;

/** Menu as big tap targets: tapping a dish adds one, the minus removes one. */
export function DishPicker({ dishes, cart, onChange, disabled }: { dishes: Dish[]; cart: Cart; onChange: (c: Cart) => void; disabled?: boolean }) {
  const groups = CATEGORIES.map((c) => [c, dishes.filter((d) => d.category === c)] as const).filter(([, l]) => l.length);
  const set = (id: string, q: number) => {
    const next = { ...cart };
    if (q <= 0) delete next[id];
    else next[id] = Math.min(q, 9);
    vibrate(8);
    onChange(next);
  };
  return (
    <div className="stack" style={{ gap: 20 }}>
      {groups.map(([cat, list]) => (
        <section key={cat}>
          {groups.length > 1 && <h3 className="section-title">{cat}s</h3>}
          <div className="dishes">
            {list.map((d) => {
              const q = cart[d.id] ?? 0;
              return (
                <div
                  key={d.id}
                  className={"dish" + (q ? " on" : "")}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-disabled={disabled || undefined}
                  aria-label={`${d.name}, ${formatPrice(d.price)}${q ? `, ${q} choisi${q > 1 ? "s" : ""}` : ""}. Ajouter`}
                  onClick={() => !disabled && set(d.id, q + 1)}
                  onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(d.id, q + 1); }
                    if (e.key === "Backspace" || e.key === "-") { e.preventDefault(); set(d.id, q - 1); }
                  }}
                >
                  <div className="dish-main">
                    <span className="dish-name">{d.name}</span>
                    <span className="dish-price num">{d.price ? formatPrice(d.price) : "Prix à voir"}</span>
                  </div>
                  <div className="qty">
                    {q > 0 && (
                      <>
                        <button className="qty-btn" type="button" aria-label={`Retirer un ${d.name}`} disabled={disabled}
                          onClick={(e) => { e.stopPropagation(); set(d.id, q - 1); }}>−</button>
                        <span className="qty-n num" aria-hidden>{q}</span>
                      </>
                    )}
                    <span className="qty-btn plus" aria-hidden>+</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function cartTotal(dishes: Dish[], cart: Cart) {
  let total = 0;
  let items = 0;
  for (const d of dishes) {
    const q = cart[d.id] ?? 0;
    total += q * d.price;
    items += q;
  }
  return { total, items };
}

export function sameCart(a: Cart, b: Cart) {
  const ka = Object.keys(a).filter((k) => a[k] > 0);
  const kb = Object.keys(b).filter((k) => b[k] > 0);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

export function LoadingList() {
  return (
    <div className="stack" aria-busy="true" aria-label="Chargement">
      <div className="skeleton" style={{ height: 130 }} />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
