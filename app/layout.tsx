import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/toast";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Sama Agn",
  description: "Chacun choisit son repas dans le menu du jour, la personne qui va au restaurant récupère la feuille.",
  applicationName: "Sama Agn",
  appleWebApp: { capable: true, title: "Sama Agn", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/192", apple: "/icons/apple" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1310" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" />
      </head>
      <body>
        {children}
        <Toaster />
        <SwRegister />
      </body>
    </html>
  );
}
