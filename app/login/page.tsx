"use client";
import { useState } from "react";

type Role = "member" | "admin";

export default function Login() {
  const [role, setRole] = useState<Role>("member");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(r: Role) {
    setRole(r);
    setErr("");
    setCode("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name, role }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Connexion impossible");
      window.location.href = data?.me?.admin && role === "admin" ? "/gestion" : "/";
    } catch (e) {
      setErr((e as Error).message === "Failed to fetch" ? "Pas de connexion internet." : (e as Error).message);
      setBusy(false);
    }
  }

  const admin = role === "admin";
  return (
    <main className="login">
      <div className="login-hero">
        <div className="logo-mark" aria-hidden><i /></div>
        <h1 className="h1">Sama Agn</h1>
        <p className="muted" style={{ fontSize: 17, margin: "8px 0 0" }}>
          Choisissez votre plat en deux touches. La personne qui va au restaurant a tout sur sa feuille.
        </p>
      </div>

      <form className="stack" onSubmit={submit} style={{ gap: 16 }}>
        <div className="seg" role="radiogroup" aria-label="Je me connecte pour">
          <button type="button" role="radio" aria-checked={!admin} aria-pressed={!admin} onClick={() => pick("member")}>Je commande</button>
          <button type="button" role="radio" aria-checked={admin} aria-pressed={admin} onClick={() => pick("admin")}>Je gère le menu</button>
        </div>

        <label className="field">
          Votre prénom
          <input className="input" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Awa" />
        </label>

        <label className="field">
          {admin ? "Code gestionnaire" : "Code du bureau"}
          <span className="pwd">
            <input
              className="input"
              type={show ? "text" : "password"}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••"
              aria-describedby="code-aide"
            />
            <button type="button" className="pwd-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le code" : "Afficher le code"}>
              {show ? "Masquer" : "Afficher"}
            </button>
          </span>
          <small id="code-aide" className="muted" style={{ fontWeight: 500, fontSize: 13 }}>
            {admin ? "Le code à part, réservé à la personne qui gère le menu." : "Demandez-le à un collègue."}
          </small>
        </label>

        {err && <p className="err" role="alert">{err}</p>}

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !code.trim() || !name.trim()}>
          {busy ? "Connexion…" : admin ? "Entrer comme gestionnaire" : "C'est parti"}
        </button>

        <p className="muted small" style={{ margin: 0, textAlign: "center" }}>
          {admin
            ? "Le gestionnaire publie le menu du jour. Il peut aussi commander comme tout le monde."
            : "Vous ne le ferez qu'une fois : ce téléphone s'en souviendra."}
        </p>
      </form>
    </main>
  );
}
