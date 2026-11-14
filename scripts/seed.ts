import { join } from "node:path";
import postgres from "postgres";
import { loadEnv } from "./env";
import { parseWorkbook } from "../lib/excel";
import { importParsed } from "../lib/importer";

loadEnv();
const url = process.env.DATABASE_URL as string;
if (!url) { console.error("DATABASE_URL belum diatur"); process.exit(1); }

async function main() {
  const file = process.argv[2] ?? join(process.cwd(), "data", "Inventory_asset_2026.xlsx");
  const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", max: 1, prepare: false,
    types: { numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) } } });

  const [{ n }] = await sql`select count(*)::int as n from assets`;
  if (n > 0 && !process.argv.includes("--force")) {
    console.log(`Tabel assets sudah berisi ${n} baris. Gunakan "npm run db:seed -- data/Inventory_asset_2026.xlsx --force" untuk menimpa.`);
    await sql.end(); return;
  }
  const parsed = await parseWorkbook(file);
  const res = await importParsed(sql, parsed, "replace");
  const [{ total }] = await sql`select coalesce(sum(amount),0)::numeric as total from assets`;
  console.log(`✔ Sheet "${parsed.sheetName}": ${res.inserted} aset diimpor, total Rp ${Number(total).toLocaleString("id-ID")}`);
  if (parsed.skipped.length) console.log("  Baris dilewati:", parsed.skipped.map((s) => `${s.row} (${s.reason})`).join(", "));
  await sql.end();

}
main().catch((e) => { console.error(e); process.exit(1); });
