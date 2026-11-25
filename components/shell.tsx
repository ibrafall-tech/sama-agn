"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/menu";
import type { Me } from "@/lib/types";
import { api } from "./api";
import { IconBowl, IconChef, IconSheet } from "./icons";
import { toast } from "./toast";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function useInstall() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  return { evt, ios, standalone, clear: () => setEvt(null) };
}

export function TopBar({ me }: { me: Me | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [name, setName] = useState(me?.name ?? "");
  const install = useInstall();
  useEffect(() => setName(me?.name ?? ""), [me?.name]);

  async function saveName() {
    if (!name.trim() || name.trim() === me?.name) return ref.current?.close();
    try {
      await api("/api/session", { method: "PATCH", json: { name: name.trim() } });
      toast("Prénom mis à jour");
      ref.current?.close();
      router.refresh();
      window.dispatchEvent(new Event("midi:refresh"));
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function logout() {
    await api("/api/session", { method: "DELETE" }).catch(() => {});
    window.location.href = "/login";
  }
  async function doInstall() {
    if (!install.evt) return;
    await install.evt.prompt();
    install.clear();
  }

  return (
    <header className="topbar">
      <Link href="/" className="logo" aria-label="Sama Agn, accueil">
        <span className="logo-mark" aria-hidden><i /></span>
        Sama Agn
      </Link>
      <div className="row" style={{ gap: 8 }}>
        {!install.standalone && install.evt && (
          <button className="btn btn-sm btn-sun" type="button" onClick={doInstall}>Installer l&apos;app</button>
        )}
        <button className="avatar" type="button" aria-label="Mon profil" onClick={() => ref.current?.showModal()}>
          {me ? initials(me.name) : "·"}
        </button>
      </div>
      <dialog ref={ref} className="sheet" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="sheet-body">
          <div className="sheet-grip" />
          <h2 className="h2">Mon profil</h2>
          <label className="field">
            Mon prénom
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
          </label>
          <button className="btn btn-primary btn-lg btn-block" type="button" onClick={saveName}>Enregistrer</button>
          {me?.admin && <p className="muted small" style={{ margin: 0 }}>Vous êtes gestionnaire : vous pouvez saisir le menu.</p>}
          {!install.standalone && install.ios && (
            <p className="muted small" style={{ margin: 0 }}>
              Pour l&apos;avoir comme une app sur iPhone : touchez <b>Partager</b> puis <b>Sur l&apos;écran d&apos;accueil</b>.
            </p>
          )}
          <button className="btn btn-ghost btn-block btn-danger" type="button" onClick={logout}>Se déconnecter</button>
        </div>
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
            {t.icon}
            {t.label}
            {!!t.badge && <span className="badge num">{t.badge}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
