"use client";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, parseMenuText } from "@/lib/menu";
import { addDays, dateKey, longDate } from "@/lib/time";
import { CATEGORIES, type Category, type HistoryPayload } from "@/lib/types";
import { api, useDay } from "./api";
import { LoadingList } from "./day-parts";
import { IconCheck, IconPlus, IconX } from "./icons";
import { BottomNav, TopBar } from "./shell";
import { toast } from "./toast";

const weekday = (key: string) => new Date(key + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long" });

type Row = { key: string; id?: string; name: string; price: string; category: Category };
const newKey = () => Math.random().toString(36).slice(2);

export function ManageScreen() {
  const today = dateKey();
  const [date, setDate] = useState(today);
  const { data, error, reload } = useDay(date);
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [restaurant, setRestaurant] = useState("");
  const [deadline, setDeadline] = useState("11:30");
  const [dirty, setDirty] = useState(false);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState("");

  // Fill the form from the stored menu once per date, then let the manager edit freely.
  useEffect(() => {
    setRows(null);
    setDirty(false);
  }, [date]);
  useEffect(() => {
    if (!data || data.date !== date || rows !== null) return;
    setRestaurant(data.day?.restaurant ?? "");
    setDeadline(data.day?.deadline || "11:30");
    setRows(data.dishes.map((d) => ({ key: d.id, id: d.id, name: d.name, price: String(d.price), category: d.category })));
    if (!data.dishes.length) setShowPaste(true);
  }, [data, date, rows]);

  useEffect(() => {
    if (!data?.me.admin) return;
    api<HistoryPayload>(`/api/history?before=${date}`).then(setHistory).catch(() => {});
  }, [data?.me.admin, date]);

  const present = useMemo(() => new Set((rows ?? []).map((r) => r.name.trim().toLowerCase())), [rows]);
  const suggestions = (history?.suggestions ?? []).filter((s) => !present.has(s.name.toLowerCase())).slice(0, 16);

  function edit(next: Row[]) {
    setRows(next);
    setDirty(true);
  }
  function add(items: { name: string; price: number; category: Category }[]) {
    const fresh = items.filter((i) => !present.has(i.name.toLowerCase()));
    edit([...(rows ?? []), ...fresh.map((i) => ({ key: newKey(), name: i.name, price: i.price ? String(i.price) : "", category: i.category }))]);
    return fresh.length;
  }
  function importPaste() {
    const parsed = parseMenuText(paste);
    if (!parsed.length) return toast("Aucun plat reconnu. Mettez un plat par ligne, avec son prix.");
    const n = add(parsed);
    setPaste("");
    setShowPaste(false);
    toast(`${n} plat${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""}, vérifiez les prix`);
  }
  function reusePrevious() {
    const p = history?.previous;
    if (!p) return;
    edit(p.dishes.map((d) => ({ key: newKey(), name: d.name, price: String(d.price), category: d.category })));
    if (!restaurant) setRestaurant(p.restaurant);
    if (p.deadline) setDeadline(p.deadline);
    toast(`Menu du ${longDate(p.date)} repris`);
  }

  async function unlock() {
    setCodeErr("");
    try {
      await api("/api/session", { method: "PATCH", json: { adminCode: code } });
      setCode("");
      toast("Espace gestion débloqué");
      reload();
    } catch (e) {
      setCodeErr((e as Error).message);
    }
  }

  async function publish() {
    const dishes = (rows ?? []).filter((r) => r.name.trim()).map((r) => ({ id: r.id, name: r.name.trim(), price: Number(r.price) || 0, category: r.category }));
    if (!dishes.length) return toast("Ajoutez au moins un plat");
    setSaving(true);
    try {
      await api(`/api/day?date=${date}`, { method: "PUT", json: { restaurant: restaurant.trim(), deadline, dishes } });
      toast("Menu publié : tout le monde peut commander");
      await reload();
      setDirty(false);
      setRows(null); // refill from the stored menu so new dishes get their ids
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className="hello">
      <p className="eyebrow">Gestion</p>
      <h1 className="h1">Le menu du jour</h1>
    </div>
  );

  if (!data) {
    return (
      <main className="page no-dock">
        <TopBar me={null} />
        {header}
        {error ? <div className="banner">{error}</div> : <LoadingList />}
        <BottomNav />
      </main>
    );
  }

  if (!data.me.admin) {
    return (
      <main className="page no-dock">
        <TopBar me={data.me} />
        {header}
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); unlock(); }}>
          <h2 className="h2">Réservé au gestionnaire</h2>
          <p className="muted" style={{ margin: 0 }}>La personne qui saisit le menu a un code à part. Entrez-le une fois, il reste mémorisé sur ce téléphone.</p>
          <label className="field">
            Code gestionnaire
            <input className="input" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {codeErr && <p className="err">{codeErr}</p>}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={!code.trim()}>Débloquer</button>
        </form>
        <BottomNav count={data.orders.length} />
      </main>
    );
  }

  const list = rows ?? [];
  const valid = list.filter((r) => r.name.trim()).length;

  return (
    <main className="page">
      <TopBar me={data.me} />
      {header}

      <div className="seg" role="group" aria-label="Jour du menu">
        <button type="button" aria-pressed={date === today} onClick={() => setDate(today)}>Aujourd&apos;hui</button>
        <button type="button" aria-pressed={date !== today} onClick={() => setDate(addDays(today, 1))}>Demain</button>
      </div>
      <p className="muted small cap">{longDate(date)}{data.orders.length ? ` · ${data.orders.length} commande${data.orders.length > 1 ? "s" : ""} déjà passée${data.orders.length > 1 ? "s" : ""}` : ""}</p>

      {rows === null ? <LoadingList /> : (
        <div className="stack" style={{ gap: 20 }}>
          <div className="card stack">
            <label className="field">
              Restaurant
              <input className="input" value={restaurant} maxLength={80} placeholder="Ex. Chez Fatou" onChange={(e) => { setRestaurant(e.target.value); setDirty(true); }} />
            </label>
            <label className="field">
              Heure limite des commandes
              <input className="input" type="time" value={deadline} onChange={(e) => { setDeadline(e.target.value); setDirty(true); }} />
            </label>
          </div>

          <div className="card stack">
            <div className="spread">
              <h2 className="h2">Coller le menu reçu</h2>
              {!showPaste && <button className="link-btn" type="button" onClick={() => setShowPaste(true)}>Ouvrir</button>}
            </div>
            {showPaste ? (
              <>
                <p className="muted small" style={{ margin: 0 }}>Copiez le message du restaurant (WhatsApp, SMS) et collez-le ici. Un plat par ligne, le prix à la fin.</p>
                <textarea className="input" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)}
                  placeholder={"Thiéboudienne 2500\nYassa poulet - 2 000 F\nMafé : 2000\n\nBoissons :\nBissap 500\nGingembre 500"} />
                <button className="btn btn-primary btn-block" type="button" disabled={!paste.trim()} onClick={importPaste}>Ajouter ces plats</button>
              </>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>Le plus rapide quand le restaurant envoie son menu par message.</p>
            )}
          </div>

          {(history?.previous || suggestions.length > 0) && (
            <div className="stack">
              {history?.previous && !list.length && (
                <button className="btn btn-sun btn-block" type="button" onClick={reusePrevious}>Reprendre le menu de {weekday(history.previous.date)}</button>
              )}
              {suggestions.length > 0 && (
                <>
                  <h3 className="section-title" style={{ margin: 0 }}>Déjà servis, un geste pour ajouter</h3>
                  <div className="row" style={{ gap: 6 }}>
                    {suggestions.map((s) => (
                      <button key={s.name} className="chip" type="button" onClick={() => add([s])}>
                        + {s.name} <span className="muted num">{formatPrice(s.price)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <section className="stack">
            <div className="spread">
              <h2 className="h2">Plats · {valid}</h2>
              {list.length > 0 && <button className="link-btn" style={{ color: "var(--muted)" }} type="button" onClick={() => edit([])}>Tout effacer</button>}
            </div>
            {list.map((r, i) => (
              <div key={r.key} className="dish-edit">
                <div className="editor-row">
                  <input className="input input-sm" aria-label="Nom du plat" value={r.name} maxLength={80} placeholder="Nom du plat"
                    autoCapitalize="sentences" enterKeyHint="next"
                    onChange={(e) => edit(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <button className="icon-btn" type="button" aria-label={`Supprimer ${r.name || "ce plat"}`} onClick={() => edit(list.filter((_, j) => j !== i))}><IconX /></button>
                  <div className="editor-sub">
                    <label className="price-field">
                      <input className="input input-sm num" aria-label="Prix en francs CFA" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" value={r.price} placeholder="Prix"
                        onChange={(e) => edit(list.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/\D/g, "").slice(0, 7) } : x)))} />
                      <span aria-hidden>F</span>
                    </label>
                    <select className="input input-sm" aria-label="Catégorie" value={r.category}
                      onChange={(e) => edit(list.map((x, j) => (j === i ? { ...x, category: e.target.value as Category } : x)))}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-block" type="button" onClick={() => edit([...list, { key: newKey(), name: "", price: "", category: "Plat" }])}><IconPlus /> Ajouter un plat</button>
          </section>
        </div>
      )}

      {rows !== null && (dirty || !data.day || valid > 0) && (
        <div className="dock">
          <div className="dock-inner">
            {!dirty && data.day ? (
              <div className="done">
                <span className="done-icon"><IconCheck /></span>
                <div className="done-text">
                  <b>Menu publié · {data.dishes.length} plat{data.dishes.length > 1 ? "s" : ""}</b>
                  <span className="muted small">Modifiez-le ici, puis republiez.</span>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary btn-lg btn-block" type="button" disabled={saving || !valid} onClick={publish}>
                {saving ? "Publication…" : !valid ? "Ajoutez au moins un plat" : <><span>{data.day ? "Republier le menu" : "Publier le menu"}</span><span className="btn-pill num">{valid} plat{valid > 1 ? "s" : ""}</span></>}
              </button>
            )}
          </div>
        </div>
      )}
      <BottomNav count={data.orders.length} />
    </main>
  );
}
