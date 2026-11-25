import { fail, getSession } from "@/lib/auth";
import { deleteOrder, getDay, upsertOrder } from "@/lib/repo";
import { dateKey, isDateKey } from "@/lib/time";
import { firstError, orderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Save (or empty) my order, or a colleague's when `forId` is set. */
export async function PUT(req: Request) {
  const me = await getSession();
  if (!me) return fail(401, "Session expirée, reconnectez-vous.");
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, firstError(parsed.error));
  const { date, forId, note, items } = parsed.data;
  if (!isDateKey(date) || date < dateKey()) return fail(400, "On ne peut plus commander pour ce jour.");

  const day = await getDay(date);
  if (!day) return fail(404, "Le menu de ce jour n'est pas encore publié.");
  const canManage = me.admin || day.runnerPid === me.pid;
  if (forId && !canManage) return fail(403, "Seule la personne qui y va peut ajouter une commande pour un collègue.");
  if (day.closed && !canManage) return fail(409, "Les commandes sont clôturées. Voyez directement avec la personne qui y va.");

  const name = (forId ? parsed.data.name : parsed.data.name ?? me.name)?.trim();
  if (!name) return fail(400, "Indiquez le prénom du collègue.");
  const order = await upsertOrder({ date, personId: forId ?? me.pid, name, note, items, createdBy: me.pid });
  return Response.json({ order });
}

export async function DELETE(req: Request) {
  const me = await getSession();
  if (!me) return fail(401, "Session expirée, reconnectez-vous.");
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const personId = url.searchParams.get("personId") ?? me.pid;
  if (!isDateKey(date)) return fail(400, "Date invalide");
  const day = await getDay(date);
  if (!day) return fail(404, "Jour introuvable");
  const canManage = me.admin || day.runnerPid === me.pid;
  if (personId !== me.pid && !canManage) return fail(403, "Vous ne pouvez retirer que votre propre commande.");
  if (day.closed && !canManage) return fail(409, "Les commandes sont clôturées.");
  await deleteOrder(date, personId);
  return Response.json({ ok: true });
}
