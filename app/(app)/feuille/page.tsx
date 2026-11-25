import type { Metadata } from "next";
import { SheetScreen } from "@/components/sheet-screen";

export const metadata: Metadata = { title: "La feuille · Commande du midi" };

export default function Feuille() {
  return <SheetScreen />;
}
