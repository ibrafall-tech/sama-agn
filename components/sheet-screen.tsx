"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice, linesLabel, sheetText, summarize } from "@/lib/menu";
import { longDate } from "@/lib/time";
import type { DayPayload, Order } from "@/lib/types";
import { api, useDay, vibrate } from "./api";
import { cartTotal, DishPicker, LoadingList, StatusCard, type Cart } from "./day-parts";
import { IconCheck, IconCopy, IconLock, IconPlus, IconPrint, IconShare, IconX } from "./icons";
import { BottomNav, closeOnBackdrop, TopBar } from "./shell";
import { toast } from "./toast";

/** Ticks for "handed out", kept on the runner's phone only. */
function useHanded(date: string | undefined) {
  const key = `midi:handed:${date}`;
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!date) return;
    try { setSet(new Set(JSON.parse(localStorage.getItem(key) || "[]"))); } catch { setSet(new Set()); }
  }, [date, key]);
  const toggle = (id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
      return next;
    });
    vibrate(8);
  };
  return { has: (id: string) => set.has(id), toggle, count: set.size };
}

export function SheetScreen() {
  const { data, error, reload } = useDay(null);
  const [tab, setTab] = useState<"plats" | "personnes">("plats");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [editing, setEditing] = useState<Order | "new" | null>(null);
  const handed = useHanded(data?.date);

  if (!data) {
    return (
      <main className="page no-dock">
        <TopBar me={null} />
        <div className="hello"><h1 className="h1">La feuille</h1></div>
        {error ? <div className="banner">{error}</div> : <LoadingList />}
        <BottomNav />
      </main>
    );
  }

  const { dishes, people, total, items } = summarize(data.orders);
  const day = data.day;
  const canManage = data.me.admin || (!!day && day.runnerPid === data.me.pid);
  const text = sheetText(longDate(data.date), day, data.orders);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Feuille copiée");
    } catch {
      toast("Copie impossible sur cet appareil");
    }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "Sama Agn", text }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
  async function toggleClosed() {
    try {
      await api(`/api/day?date=${data!.date}`, { method: "PATCH", json: { closed: !day!.closed } });
      toast(day!.closed ? "Commandes rouvertes" : "Commandes clôturées : plus personne ne peut modifier");
      reload();
    } catch (e) { toast((e as Error).message); }
  }
  async function remove(o: Order) {
    try {
      await api(`/api/order?date=${data!.date}&personId=${encodeURIComponent(o.personId)}`, { method: "DELETE" });
      toast(`Commande de ${o.name} supprimée`);
      setConfirmDel(null);
      reload();
    } catch (e) { toast((e as Error).message); }
  }

  return (
    <main className="page no-dock">
      <TopBar me={data.me} />
      <div className="hello">
        <p className="eyebrow">{longDate(data.date)}</p>
        <h1 className="h1">La feuille</h1>
      </div>

      {!people.length ? (
        <div className="card empty">
          <div className="empty-art" aria-hidden><i /></div>
          <h2 className="h2">Aucune commande pour l&apos;instant</h2>
          <p className="muted">La feuille se remplit toute seule au fur et à mesure que chacun valide.</p>
          {day && data.dishes.length ? <Link className="btn btn-primary btn-lg" href="/">Passer ma commande</Link> : null}
        </div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {day && <div className="no-print"><StatusCard data={data} onChanged={reload} /></div>}

          <div className="tiles">
            <div className="tile main"><b className="num">{formatPrice(total)}</b><span>à payer</span></div>
            <div className="tile"><b className="num">{people.length}</b><span>personne{people.length > 1 ? "s" : ""}</span></div>
            <div className="tile"><b className="num">{items}</b><span>article{items > 1 ? "s" : ""}</span></div>
          </div>

          <div className="stack no-print" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-lg btn-block" type="button" onClick={share}><IconShare /> Envoyer la feuille</button>
            <div className="actions-grid">
              <button className="btn btn-tool" type="button" onClick={copy}><IconCopy /> Copier</button>
              <button className="btn btn-tool" type="button" onClick={() => window.print()}><IconPrint /> Imprimer</button>
              {canManage && day && (
                <button className="btn btn-tool" type="button" onClick={toggleClosed}><IconLock /> {day.closed ? "Rouvrir" : "Clôturer"}</button>
              )}
            </div>
          </div>

          <div className="seg no-print" role="group" aria-label="Affichage">
            <button type="button" aria-pressed={tab === "plats"} onClick={() => setTab("plats")}>À commander</button>
            <button type="button" aria-pressed={tab === "personnes"} onClick={() => setTab("personnes")}>Par personne</button>
          </div>

          {(tab === "plats") && (
            <section aria-label="À commander au restaurant" className="no-print">
              <div className="list">
                {dishes.map((d) => (
                  <div className="li" key={d.name + d.price}>
                    <span className="li-qty num">{d.qty}</span>
                    <div className="li-main"><b>{d.name}</b><small className="num">{formatPrice(d.price)} l&apos;unité</small></div>
                    <span className="li-amount num">{formatPrice(d.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="muted small">Montrez cet écran au restaurant : tout est regroupé par plat.</p>
            </section>
          )}

          {tab === "personnes" && (
            <section aria-label="Par personne" className="no-print">
              <div className="list">
                {people.map((o) => (
                  <div className={"li" + (handed.has(o.id) ? " handed" : "")} key={o.id}>
                    <button className="check" type="button" role="checkbox" aria-checked={handed.has(o.id)} aria-label={`${o.name} servi`} onClick={() => handed.toggle(o.id)}>
                      <i>{handed.has(o.id) && <IconCheck size={16} />}</i>
                    </button>
                    <div className="li-main">
                      <b>{o.name}</b>
                      <small>{linesLabel(o)}</small>
                      {o.note && <small className="note">« {o.note} »</small>}
                      {canManage && (
                        <span className="li-actions">
                          <button className="link-btn small" type="button" onClick={() => { setConfirmDel(null); setEditing(o); }}>Modifier</button>
                          {confirmDel === o.id ? (
                            <>
                              <button className="link-btn small" style={{ color: "var(--danger)" }} type="button" onClick={() => remove(o)}>Oui, supprimer</button>
                              <button className="link-btn small" style={{ color: "var(--muted)" }} type="button" onClick={() => setConfirmDel(null)}>Non</button>
                            </>
                          ) : (
                            <button className="link-btn small" style={{ color: "var(--muted)" }} type="button" onClick={() => setConfirmDel(o.id)}>Supprimer</button>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="li-amount num">{formatPrice(o.total)}</span>
                  </div>
                ))}
              </div>
              <p className="muted small">Cochez au fur et à mesure que vous distribuez · {people.filter((p) => handed.has(p.id)).length}/{people.length} servis</p>
            </section>
          )}

          {canManage && day && data.dishes.length > 0 && (
            <button className="btn btn-block no-print" type="button" onClick={() => setEditing("new")}><IconPlus /> Ajouter pour un collègue</button>
          )}

          <PrintSheet data={data} />
        </div>
      )}

      {editing && <ColleagueDialog data={data} order={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <BottomNav count={data.orders.length} />
    </main>
  );
}

function PrintSheet({ data }: { data: DayPayload }) {
  const { dishes, people, total } = summarize(data.orders);
  return (
    <div className="print-only">
      <h2>Sama Agn · {longDate(data.date)}</h2>
      <p>{data.day?.restaurant}{data.day?.runnerName ? ` · récupérée par ${data.day.runnerName}` : ""}</p>
      <h3>À commander</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
        {dishes.map((d) => <tr key={d.name + d.price}><td style={{ padding: 4, width: 40 }}><b>{d.qty}×</b></td><td>{d.name}</td><td style={{ textAlign: "right" }}>{formatPrice(d.amount)}</td></tr>)}
      </tbody></table>
      <h3>Par personne</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
        {people.map((o) => <tr key={o.id} style={{ borderBottom: "1px dotted #999" }}><td style={{ padding: 4 }}>☐ <b>{o.name}</b></td><td>{linesLabel(o)}{o.note ? ` (${o.note})` : ""}</td><td style={{ textAlign: "right" }}>{formatPrice(o.total)}</td></tr>)}
      </tbody></table>
      <h3 style={{ textAlign: "right" }}>Total : {formatPrice(total)}</h3>
    </div>
  );
}

function ColleagueDialog({ data, order, onClose, onSaved }: { data: DayPayload; order: Order | null; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(order?.name ?? "");
  const [note, setNote] = useState(order?.note ?? "");
  const [cart, setCart] = useState<Cart>(() => Object.fromEntries((order?.lines ?? []).map((l) => [l.dishId, l.qty])));
  const [saving, setSaving] = useState(false);
  const { total, items } = cartTotal(data.dishes, cart);
  const isMine = order?.personId === data.me.pid;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function save() {
    if (!name.trim()) {
      toast("Indiquez d'abord le prénom du collègue");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const forId = isMine ? undefined : order?.personId ?? `guest-${crypto.randomUUID()}`;
      await api("/api/order", {
        method: "PUT",
        json: { date: data.date, forId, name: name.trim(), note: note.trim(), items: Object.entries(cart).map(([dishId, qty]) => ({ dishId, qty })) },
      });
      toast(items ? `Commande de ${name.trim()} enregistrée` : "Commande retirée");
      onSaved();
      ref.current?.close();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="collegue-titre" onClose={onClose} onClick={closeOnBackdrop}>
      <div className="sheet-body">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="h2" id="collegue-titre">{order ? `Commande de ${order.name}` : "Pour un collègue"}</h2>
          <button className="icon-close" type="button" aria-label="Fermer" autoFocus onClick={() => ref.current?.close()}><IconX size={18} /></button>
        </div>
        <label className="field">
          Prénom
          <input ref={nameRef} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex. Moussa" autoCapitalize="words" enterKeyHint="next" disabled={isMine} />
        </label>
        <DishPicker dishes={data.dishes} cart={cart} onChange={setCart} />
        <label className="field">
          Précision
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Facultatif" enterKeyHint="done" />
        </label>
        <div className="sheet-foot">
          <button className="btn btn-primary btn-lg btn-block" type="button" disabled={saving || (!items && !order)} onClick={save}>
            {saving ? "Enregistrement…" : items ? <><span>Enregistrer <span className="num">({items})</span></span><span className="btn-pill num">{formatPrice(total)}</span></> : "Retirer la commande"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
