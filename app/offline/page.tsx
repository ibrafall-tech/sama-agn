export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="login">
      <div className="login-hero">
        <div className="logo-mark" aria-hidden><i /></div>
        <h1 className="h1">Pas de connexion</h1>
        <p className="muted">Les commandes ont besoin d&apos;internet pour arriver chez tout le monde. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.</p>
      </div>
      <a className="btn btn-primary btn-lg btn-block" href="/">Réessayer</a>
    </main>
  );
}
