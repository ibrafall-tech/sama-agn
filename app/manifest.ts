import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Commande du midi",
    short_name: "Midi",
    description: "Le menu du jour, la commande de chacun et la feuille pour le restaurant.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f1",
    theme_color: "#0d7a4e",
    categories: ["food", "productivity"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Commander", url: "/", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "La feuille", url: "/feuille", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
  };
}
