import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { loadEnv } from "./env";

loadEnv();
const url = process.env.DATABASE_URL as string;
if (!url) { console.error("DATABASE_URL belum diatur"); process.exit(1); }

async function main() {
  const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", max: 1, prepare: false });
  await sql.unsafe(readFileSync(join(process.cwd(), "sql", "schema.sql"), "utf8"));
  console.log("✔ Skema database siap (tabel dibuat / dimigrasi).");
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
