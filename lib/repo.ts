import type postgres from "postgres";
import { db, ready } from "./db";
import type { Category, Day, Dish, HistoryPayload, Order, OrderLine } from "./types";
import { CATEGORIES } from "./types";
import type { MenuInput } from "./validation";

type Row = Record<string, unknown>;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));
const cat = (v: unknown): Category => (CATEGORIES.includes(v as Category) ? (v as Category) : "Plat");

function toDay(r: Row): Day {
  return {
    date: String(r.date),
    restaurant: String(r.restaurant ?? ""),
    deadline: String(r.deadline ?? ""),
    runnerPid: (r.runner_pid as string) ?? null,
    runnerName: (r.runner_name as string) ?? null,
    closed: r.closed === true,
    updatedAt: iso(r.updated_at),
  };
}

function toDish(r: Row): Dish {
  return { id: String(r.id), name: String(r.name), price: Number(r.price), category: cat(r.category), position: Number(r.position) };
}

function toOrder(r: Row): Order {
  let raw = r.lines;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  const lines = (Array.isArray(raw) ? raw : []) as OrderLine[];
  return {
    id: String(r.id),
    personId: String(r.person_id),
    name: String(r.name),
    note: String(r.note ?? ""),
    lines,
    total: Number(r.total),
    createdBy: String(r.created_by),
    updatedAt: iso(r.updated_at),
  };
}

const DAY_COLS = "date::text as date, restaurant, deadline, runner_pid, runner_name, closed, updated_at";
const ORDER_COLS = "id, person_id, name, note, lines, total, created_by, updated_at";

export async function getDay(date: string): Promise<Day | null> {
  await ready();
  const sql = db();
  const [r] = await sql.unsafe(`select ${DAY_COLS} from days where date = $1`, [date]);
  return r ? toDay(r) : null;
}

export async function getDayPayloadParts(date: string, pid: string) {
  await ready();
  const sql = db();
  const [dayRows, dishRows, orderRows, lastRows] = await Promise.all([
    sql.unsafe(`select ${DAY_COLS} from days where date = $1`, [date]),
    sql`select id, name, price, category, position from dishes where date = ${date} order by position, name`,
    sql.unsafe(`select ${ORDER_COLS} from orders where date = $1 order by lower(name)`, [date]),
    sql.unsafe(`select ${ORDER_COLS} from orders where person_id = $1 and date < $2 order by date desc limit 1`, [pid, date]),
  ]);
  return {
    day: dayRows[0] ? toDay(dayRows[0]) : null,
    dishes: dishRows.map(toDish),
    orders: orderRows.map(toOrder),
    lastOrder: lastRows[0] ? toOrder(lastRows[0]) : null,
  };
}

export async function saveMenu(date: string, input: MenuInput): Promise<void> {
  await ready();
  await db().begin(async (txRaw) => {
    const tx = txRaw as unknown as postgres.Sql;
    await tx`
      insert into days (date, restaurant, deadline) values (${date}, ${input.restaurant}, ${input.deadline})
      on conflict (date) do update set restaurant = excluded.restaurant, deadline = excluded.deadline, updated_at = now()`;
    const keep = input.dishes.map((d) => d.id).filter((id): id is string => !!id);
    if (keep.length) await tx`delete from dishes where date = ${date} and id::text not in ${tx(keep)}`;
    else await tx`delete from dishes where date = ${date}`;
    let position = 0;
    for (const d of input.dishes) {
      position++;
      if (d.id) {
        const updated = await tx`
          update dishes set name = ${d.name}, price = ${d.price}, category = ${d.category}, position = ${position}
          where id = ${d.id} and date = ${date} returning id`;
        if (updated.length) continue;
      }
      await tx`insert into dishes (date, name, price, category, position) values (${date}, ${d.name}, ${d.price}, ${d.category}, ${position})`;
    }
  });
}

export async function setRunner(date: string, runner: { pid: string; name: string } | null): Promise<void> {
  await ready();
  await db()`update days set runner_pid = ${runner?.pid ?? null}, runner_name = ${runner?.name ?? null}, updated_at = now() where date = ${date}`;
}

export async function setClosed(date: string, closed: boolean): Promise<void> {
  await ready();
  await db()`update days set closed = ${closed}, updated_at = now() where date = ${date}`;
}

export async function getOrder(date: string, personId: string): Promise<Order | null> {
  await ready();
  const [r] = await db().unsafe(`select ${ORDER_COLS} from orders where date = $1 and person_id = $2`, [date, personId]);
  return r ? toOrder(r) : null;
}

/** Prices always come from the database, never from the client. */
export async function upsertOrder(args: {
  date: string;
  personId: string;
  name: string;
  note: string;
  items: { dishId: string; qty: number }[];
  createdBy: string;
}): Promise<Order | null> {
  await ready();
  const sql = db();
  const ids = [...new Set(args.items.map((i) => i.dishId))];
  const dishes = ids.length ? (await sql`select id, name, price from dishes where date = ${args.date} and id::text in ${sql(ids)}`).map(toDishLite) : [];
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const qty = new Map<string, number>();
  for (const i of args.items) if (byId.has(i.dishId)) qty.set(i.dishId, (qty.get(i.dishId) ?? 0) + i.qty);
  const lines: OrderLine[] = [...qty].map(([id, q]) => ({ dishId: id, name: byId.get(id)!.name, price: byId.get(id)!.price, qty: q }));
  if (!lines.length) {
    await sql`delete from orders where date = ${args.date} and person_id = ${args.personId}`;
    return null;
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const [r] = await sql`
    insert into orders (date, person_id, name, note, lines, total, created_by)
    values (${args.date}, ${args.personId}, ${args.name}, ${args.note}, ${sql.json(lines as unknown as postgres.JSONValue)}, ${total}, ${args.createdBy})
    on conflict (date, person_id) do update set name = excluded.name, note = excluded.note, lines = excluded.lines,
      total = excluded.total, created_by = excluded.created_by, updated_at = now()
    returning id, person_id, name, note, lines, total, created_by, updated_at`;
  return toOrder(r);
}

function toDishLite(r: Row) {
  return { id: String(r.id), name: String(r.name), price: Number(r.price) };
}

export async function deleteOrder(date: string, personId: string): Promise<void> {
  await ready();
  await db()`delete from orders where date = ${date} and person_id = ${personId}`;
}

export async function history(before: string): Promise<HistoryPayload> {
  await ready();
  const sql = db();
  const [sugg, prevDay] = await Promise.all([
    sql`
      select d.name, d.price, d.category, c.cnt::int as count from (
        select distinct on (lower(name)) lower(name) as k, name, price, category, date
        from dishes where date < ${before} order by lower(name), date desc
      ) d join (select lower(name) as k, count(*) as cnt from dishes where date < ${before} group by 1) c using (k)
      order by c.cnt desc, d.name limit 40`,
    sql.unsafe(
      `select ${DAY_COLS} from days d where date < $1 and exists (select 1 from dishes x where x.date = d.date) order by date desc limit 1`,
      [before],
    ),
  ]);
  let previous: HistoryPayload["previous"] = null;
  if (prevDay[0]) {
    const day = toDay(prevDay[0]);
    const dishes = await sql`select name, price, category from dishes where date = ${day.date} order by position, name`;
    previous = {
      date: day.date,
      restaurant: day.restaurant,
      deadline: day.deadline,
      dishes: dishes.map((d) => ({ name: String(d.name), price: Number(d.price), category: cat(d.category) })),
    };
  }
  return {
    suggestions: sugg.map((s) => ({ name: String(s.name), price: Number(s.price), category: cat(s.category), count: Number(s.count) })),
    previous,
  };
}
