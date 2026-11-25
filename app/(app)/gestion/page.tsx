import type { Metadata } from "next";
import { ManageScreen } from "@/components/manage-screen";

export const metadata: Metadata = { title: "Menu du jour · Commande du midi" };

export default function Gestion() {
  return <ManageScreen />;
}
