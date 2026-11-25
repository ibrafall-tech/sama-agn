"use client";
import { useState } from "react";

export default function Login() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Connexion impossible");
      window.location.href = "/";
    } catch (e) {
      setErr((e as Error).message === "Failed to fetch" ? "Pas de connexion internet." : (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="login-hero">
        <div className="logo-mark" aria-hidden><i /></div>
        <h1 className="h1">Sama Agn</h1>
        <p className="muted" style={{ fontSize: 17 }}>Choisissez votre plat en deux touches. La personne qui va au restaurant a tout sur sa feuille.</p>
      </div>
      <form className="stack" onSubmit={submit} style={{ gap: 16 }}>
        <label className="field">
          Votre prénom
          <input className="input" autoComplete="given-name" autoCapitalize="words" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Awa" />
        </label>
        <label className="field">
          Code du bureau
          <input className="input" type="password" autoComplete="off" autoCapitalize="none" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Demandez-le à un collègue" />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !code.trim() || !name.trim()}>
          {busy ? "Connexion…" : "C'est parti"}
        </button>
        <p className="muted small" style={{ margin: 0, textAlign: "center" }}>Vous ne le ferez qu&apos;une fois : ce téléphone s&apos;en souviendra.</p>
      </form>
    </main>
  );
}
