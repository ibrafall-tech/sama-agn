"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/menu";
import type { Me } from "@/lib/types";
import { api } from "./api";
import { IconBowl, IconChef, IconShareIos, IconSheet, IconX } from "./icons";
import { toast } from "./toast";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Close a <dialog> when the backdrop (outside the sheet) is tapped. */
export function closeOnBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
  const d = e.currentTarget;
  if (e.target !== d) return;
  const r = d.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) d.close();
}

/** Installation helper: native prompt on Android/Chrome, instructions on iPhone/iPad Safari. */
export function InstallBanner() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem("midi:install-dismissed") === "1"; } catch {}
    if (standalone || dismissed) return;
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
    if (isIos && isSafari) {
      setIos(true);
      setHidden(false);
    }
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setHidden(false);
    };
    const installed = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem("midi:install-dismissed", "1"); } catch {}
  }
  async function install() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice.catch(() => ({ outcome: "dismissed" }));
    setEvt(null);
    if (outcome === "accepted") setHidden(true);
  }

  if (hidden || (!evt && !ios)) return null;
  return (
    <div className="install no-print" role="region" aria-label="Installer l'application">
      <span className="logo-mark" aria-hidden><i /></span>
      <div className="install-text">
        <b>Installez Sama Agn</b>
        {evt ? (
          <span className="muted">Une icône sur l&apos;écran d&apos;accueil, comme une vraie app.</span>
        ) : (
          <span className="muted">Touchez <IconShareIos /> <b style={{ display: "inline" }}>Partager</b>, puis <b style={{ display: "inline" }}>Sur l&apos;écran d&apos;accueil</b>.</span>
        )}
      </div>
      {evt && <button className="btn btn-sm btn-primary" type="button" onClick={install}>Installer</button>}
      <button className="icon-close" type="button" aria-label="Masquer" onClick={dismiss}><IconX size={16} /></button>
    </div>
  );
}

export function TopBar({ me }: { me: Me | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [name, setName] = useState(me?.name ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setName(me?.name ?? ""), [me?.name]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || clean === me?.name) return ref.current?.close();
    setSaving(true);
    try {
      await api("/api/session", { method: "PATCH", json: { name: clean } });
      toast("Prénom mis à jour");
      ref.current?.close();
      router.refresh();
      window.dispatchEvent(new Event("midi:refresh"));
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function dropAdmin() {
    try {
      await api("/api/session", { method: "PATCH", json: { dropAdmin: true } });
      toast("Mode gestionnaire désactivé sur ce téléphone");
      ref.current?.close();
      window.dispatchEvent(new Event("midi:refresh"));
      router.refresh();
    } catch (err) {
      toast((err as Error).message);
    }
  }
  async function logout() {
    await api("/api/session", { method: "DELETE" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <header className="topbar">
      <Link href="/" className="logo" aria-label="Sama Agn, accueil">
        <span className="logo-mark" aria-hidden><i /></span>
        Sama Agn
      </Link>
      <button className="avatar" type="button" aria-label="Mon profil" onClick={() => ref.current?.showModal()}>
        {me ? initials(me.name) : ""}
      </button>
      <dialog ref={ref} className="sheet" aria-labelledby="profil-titre" onClick={closeOnBackdrop}>
        <form className="sheet-body" onSubmit={saveName}>
          <div className="sheet-grip" />
          <div className="sheet-head">
            <h2 className="h2" id="profil-titre">Mon profil</h2>
            {/* autoFocus here so iOS does not open the keyboard right away */}
            <button className="icon-close" type="button" aria-label="Fermer" autoFocus onClick={() => ref.current?.close()}><IconX size={18} /></button>
          </div>
          <label className="field">
            Mon prénom
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" autoCapitalize="words" enterKeyHint="done" />
          </label>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={saving || !name.trim()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <div className="spread" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <span className={"role-badge" + (me?.admin ? " admin" : "")}>{me?.admin ? "Gestionnaire" : "Collègue"}</span>
            {me?.admin ? (
              <button className="link-btn small" style={{ color: "var(--muted)" }} type="button" onClick={dropAdmin}>Quitter le mode gestionnaire</button>
            ) : (
              <Link className="link-btn small" href="/gestion" onClick={() => ref.current?.close()}>J&apos;ai le code gestionnaire</Link>
            )}
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {me?.admin
              ? "Vous publiez le menu du jour. Vous commandez aussi comme tout le monde."
              : "Pour aller chercher les repas, touchez « J'y vais » sur la carte du jour : pas besoin de compte."}
          </p>
          <button className="btn btn-ghost btn-block btn-danger" type="button" onClick={logout}>Se déconnecter</button>
        </form>
      </dialog>
    </header>
  );
}

export function BottomNav({ count }: { count?: number }) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Commander", icon: <IconBowl /> },
    { href: "/feuille", label: "La feuille", icon: <IconSheet />, badge: count },
    { href: "/gestion", label: "Menu", icon: <IconChef /> },
  ];
  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="nav-inner">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
            <span className="ico">
              {t.icon}
              {!!t.badge && <span className="badge num" aria-label={`${t.badge} commandes`}>{t.badge > 99 ? "99+" : t.badge}</span>}
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
