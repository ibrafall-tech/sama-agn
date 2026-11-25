import postgres from "postgres";
import { SCHEMA } from "@/db/schema";

type Sql = postgres.Sql;

declare global {
  // eslint-disable-next-line no-var
  var __midiSql: Sql | undefined;
  // eslint-disable-next-line no-var
  var __midiSchema: Promise<void> | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL manquant : voir .env.example");
  return url;
}

export function db(): Sql {
  if (!globalThis.__midiSql) {
    const url = connectionString();
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    globalThis.__midiSql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      prepare: false, // works through Neon / PgBouncer poolers
      ssl: local ? false : "require",
      onnotice: () => {},
    });
  }
  return globalThis.__midiSql;
}

/** Creates the tables once per server instance. */
export function ready(): Promise<void> {
  if (!globalThis.__midiSchema) {
    globalThis.__midiSchema = (async () => {
      const sql = db();
      for (const stmt of SCHEMA) await sql.unsafe(stmt);
    })().catch((e) => {
      globalThis.__midiSchema = undefined;
      throw e;
    });
  }
  return globalThis.__midiSchema;
}
