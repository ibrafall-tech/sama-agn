import { fail, getSession } from "@/lib/auth";
import { history } from "@/lib/repo";
import { dateKey, isDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Dishes seen on earlier menus, and the latest menu, to fill a new menu fast. */
export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return fail(401, "Session expirée, reconnectez-vous.");
  if (!me.admin) return fail(403, "Réservé au gestionnaire.");
  const before = new URL(req.url).searchParams.get("before") || dateKey();
  if (!isDateKey(before)) return fail(400, "Date invalide");
  return Response.json(await history(before), { headers: { "Cache-Control": "no-store" } });
}
