import { fail, getSession } from "@/lib/auth";
import { getDay, getDayPayloadParts, saveMenu, setClosed, setRunner } from "@/lib/repo";
import { addDays, dateKey, isDateKey } from "@/lib/time";
import type { DayPayload } from "@/lib/types";
import { dayPatchSchema, firstError, menuSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function allowedDate(raw: string | null): string | null {
  const today = dateKey();
  const date = raw || today;
  if (!isDateKey(date)) return null;
  if (date < addDays(today, -60) || date > addDays(today, 14)) return null;
  return date;
}

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return fail(401, "Session expirée, reconnectez-vous.");
  const date = allowedDate(new URL(req.url).searchParams.get("date"));
  if (!date) return fail(400, "Date invalide");
  const parts = await getDayPayloadParts(date, me.pid);
  const body: DayPayload = { date, today: dateKey(), ...parts, me: { pid: me.pid, name: me.name, admin: me.admin } };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

/** Publish or replace the menu of a day. Managers only. */
export async function PUT(req: Request) {
  const me = await getSession();
  if (!me) return fail(401, "Session expirée, reconnectez-vous.");
  if (!me.admin) return fail(403, "Seul le gestionnaire peut modifier le menu.");
  const date = allowedDate(new URL(req.url).searchParams.get("date"));
  if (!date) return fail(400, "Date invalide");
  const parsed = menuSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, firstError(parsed.error));
  await saveMenu(date, parsed.data);
  return Response.json({ ok: true });
}

/** "J'y vais" for anyone; closing orders for the manager or the person going. */
export async function PATCH(req: Request) {
  const me = await getSession();
  if (!me) return fail(401, "Session expirée, reconnectez-vous.");
  const date = allowedDate(new URL(req.url).searchParams.get("date"));
  if (!date) return fail(400, "Date invalide");
  const parsed = dayPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, firstError(parsed.error));
  const day = await getDay(date);
  if (!day) return fail(404, "Pas encore de menu pour ce jour.");
  const isRunner = day.runnerPid === me.pid;

  if (parsed.data.runner === "claim") {
    if (day.runnerPid && !isRunner && !me.admin) return fail(409, `${day.runnerName ?? "Quelqu'un"} y va déjà.`);
    await setRunner(date, { pid: me.pid, name: me.name });
  } else if (parsed.data.runner === "release") {
    if (!isRunner && !me.admin) return fail(403, "Seule la personne qui y va peut se retirer.");
    await setRunner(date, null);
  }
  if (parsed.data.closed !== undefined) {
    if (!me.admin && !isRunner && !(parsed.data.runner === "claim")) return fail(403, "Seul le gestionnaire ou la personne qui y va peut clôturer.");
    await setClosed(date, parsed.data.closed);
  }
  return Response.json({ ok: true });
}
