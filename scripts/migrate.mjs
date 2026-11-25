// Applies the schema by hand (the app also does it on first request).
// Usage: node --env-file=.env scripts/migrate.mjs
import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL manquant (voir .env.example)");
  process.exit(1);
}
const src = readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");
const statements = [...src.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]);
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: local ? false : "require", prepare: false, onnotice: () => {} });
for (const s of statements) await sql.unsafe(s);
await sql.end();
console.log(`Schéma appliqué (${statements.length} instructions).`);
