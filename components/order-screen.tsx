"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, linesLabel } from "@/lib/menu";
import { longDate } from "@/lib/time";
import type { Order } from "@/lib/types";
import { api, useDay, vibrate } from "./api";
import { cartTotal, DishPicker, LoadingList, sameCart, StatusCard, type Cart } from "./day-parts";
import { IconCheck } from "./icons";
import { BottomNav, TopBar } from "./shell";
import { toast } from "./toast";

const cartOf = (o: Order | null | undefined): Cart => Object.fromEntries((o?.lines ?? []).map((l) => [l.dishId, l.qty]));

export function OrderScreen() {
  const { data, error, online, reload } = useDay(null);
  const [cart, setCart] = useState<Cart>({});
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const mine = data?.orders.find((o) => o.personId === data.me.pid) ?? null;

  // Follow the saved order until the person starts changing it.
  useEffect(() => {
    if (!data || touched) return;
    setCart(cartOf(mine));
    setNote(mine?.note ?? "");
    if (mine?.note) setShowNote(true);
  }, [data, mine, touched]);

  const dishes = data?.dishes ?? [];
  const { total, items } = cartTotal(dishes, cart);
  const dirty = touched && (!sameCart(cart, cartOf(mine)) || note.trim() !== (mine?.note ?? ""));
  const closed = !!data?.day?.closed;

  // "Comme la dernière fois": last order's dishes that are on today's menu.
  const again = useMemo(() => {
    if (!data?.lastOrder || mine) return null;
    const byName = new Map(dishes.map((d) => [d.name.toLowerCase(), d]));
    const c: Cart = {};
    for (const l of data.lastOrder.lines) {
      const d = byName.get(l.name.toLowerCase());
      if (d) c[d.id] = l.qty;
    }
    return Object.keys(c).length ? c : null;
  }, [data?.lastOrder, dishes, mine]);

  function change(c: Cart) {
    setTouched(true);
    setCart(c);
  }

  async function submit() {
    if (!data) return;
    setSaving(true);
    try {
      await api("/api/order", {
        method: "PUT",
        json: { date: data.date, note: note.trim(), items: Object.entries(cart).filter(([, q]) => q > 0).map(([dishId, qty]) => ({ dishId, qty })) },
      });
      vibrate(30);
      toast(items ? "C'est noté ! Ta commande est envoyée" : "Commande retirée");
      setTouched(false);
      await reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <TopBar me={data?.me ?? null} />
      {!data ? (
        <>
          <div className="hello"><div className="skeleton" style={{ height: 60 }} /></div>
          {error ? <div className="banner">{error}</div> : <LoadingList />}
        </>
      ) : (
        <>
          <div className="hello">
            <p className="eyebrow">{longDate(data.date)}</p>
            <h1 className="h1">Salut <em>{data.me.name}</em>, on mange quoi&nbsp;?</h1>
          </div>
          {!online && <div className="banner" style={{ marginBottom: 12 }}>Hors connexion : reconnectez-vous pour envoyer ou voir les commandes à jour.</div>}

          {!data.day || !dishes.length ? (
            <div className="card empty">
              <div className="empty-art" aria-hidden><i /></div>
              <h2 className="h2">Le menu n&apos;est pas encore là</h2>
              <p className="muted">
                {data.me.admin ? "Vous êtes gestionnaire : ajoutez le menu du restaurant, ça prend une minute." : "Dès que le menu du jour est ajouté, il apparaît ici tout seul. Pas besoin de recharger."}
              </p>
              {data.me.admin && <Link className="btn btn-primary btn-lg" href="/gestion">Ajouter le menu du jour</Link>}
            </div>
          ) : (
            <>
              <StatusCard data={data} onChanged={reload} />

              {again && !touched && !closed && (
                <button className="chip chip-brand" type="button" style={{ marginTop: 14 }} onClick={() => change(again)}>
                  Comme la dernière fois : {linesLabel(data.lastOrder!)}
                </button>
              )}

              <div className="section">
                <DishPicker dishes={dishes} cart={cart} onChange={change} disabled={closed} />
              </div>

              {!closed && (
                <div className="section">
                  {showNote ? (
                    <label className="field">
                      Une précision pour le restaurant ?
                      <textarea className="input" rows={2} maxLength={200} placeholder="Sans piment, sauce à part, bien cuit…" value={note}
                        onChange={(e) => { setTouched(true); setNote(e.target.value); }} />
                    </label>
                  ) : (
                    <button className="link-btn" type="button" onClick={() => setShowNote(true)}>+ Ajouter une précision</button>
                  )}
                </div>
              )}

              {data.orders.length > 0 && (
                <div className="section">
                  <h3 className="section-title">Déjà commandé · {data.orders.length}</h3>
                  <div className="row" style={{ gap: 6 }}>
                    {data.orders.map((o) => <span key={o.id} className="chip">{o.name}</span>)}
                  </div>
                </div>
              )}

              <div className="dock">
                <div className="dock-inner">
                  {closed && !mine ? (
                    <div className="done" style={{ borderColor: "var(--line)" }}>
                      <div className="done-text"><b>Commandes clôturées</b><span className="muted small">Voyez directement avec {data.day.runnerName ?? "la personne qui y va"}.</span></div>
                    </div>
                  ) : mine && !dirty ? (
                    <div className="done">
                      <span className="done-icon"><IconCheck /></span>
                      <div className="done-text">
                        <b>Commande envoyée · <span className="num">{formatPrice(mine.total)}</span></b>
                        <span className="muted small">{closed ? "C'est clôturé, bon appétit." : "Touchez un plat pour la modifier."}</span>
                      </div>
                    </div>
                  ) : items > 0 ? (
                    <button className="btn btn-primary btn-lg btn-block" type="button" disabled={saving} onClick={submit}>
                      {saving ? "Envoi…" : <>{mine ? "Mettre à jour" : "Valider"} · {items} article{items > 1 ? "s" : ""} · <span className="num">{formatPrice(total)}</span></>}
                    </button>
                  ) : mine ? (
                    <button className="btn btn-lg btn-block btn-danger" type="button" disabled={saving} onClick={submit}>Retirer ma commande</button>
                  ) : (
                    <div className="done" style={{ borderColor: "var(--line)", boxShadow: "none" }}>
                      <div className="done-text"><b>Touchez un plat pour le choisir</b><span className="muted small">Vous validerez ensuite en un geste.</span></div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
      <BottomNav count={data?.orders.length} />
    </main>
  );
}
