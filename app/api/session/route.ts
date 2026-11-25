import { checkCode, clearSession, fail, getSession, pause, writeSession } from "@/lib/auth";
import { firstError, loginSchema, profileSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Sign in with the office code (or the admin code) and a first name. */
export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, firstError(parsed.error));
  const role = checkCode(parsed.data.code);
  if (!role) {
    await pause(700);
    return fail(401, "Ce code n'est pas le bon. Demandez-le à un collègue.");
  }
  const previous = await getSession();
  const s = await writeSession({ pid: previous?.pid ?? crypto.randomUUID(), name: parsed.data.name, admin: role === "admin" || !!previous?.admin });
  return Response.json({ me: { pid: s.pid, name: s.name, admin: s.admin } });
}

/** Change the first name, or unlock menu management with the admin code. */
export async function PATCH(req: Request) {
  const current = await getSession();
  if (!current) return fail(401, "Session expirée, reconnectez-vous.");
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, firstError(parsed.error));
  let admin = current.admin;
  if (parsed.data.adminCode !== undefined) {
    if (checkCode(parsed.data.adminCode) !== "admin") {
      await pause(700);
      return fail(401, "Code gestionnaire incorrect.");
    }
    admin = true;
  }
  const s = await writeSession({ pid: current.pid, name: parsed.data.name ?? current.name, admin });
  return Response.json({ me: { pid: s.pid, name: s.name, admin: s.admin } });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
