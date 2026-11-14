import type postgres from "postgres";
import type { ParsedWorkbook } from "./excel";

type Sql = postgres.Sql<any>;

const COLS = [
  "gl_account","trans_no","vendor","project","ringgisho_no","po_no","div_plant","tgl","product_code","part_number",
  "item_name","qty","ringgisho_lc","kesaisho_sales","amount","claim_to","remark","mvd_status","mvd_note","trans_ref",
  "expense_coa","expense_amount","fa_amount","fa_date","note","source_row",
] as const;

export async function importParsed(sql: Sql, parsed: ParsedWorkbook, mode: "replace" | "append") {
  return await sql.begin(async (tx: any) => {
    for (const [i, a] of parsed.glAccounts.entries()) {
      await tx`insert into gl_accounts (code, name, sort_order) values (${a.code}, ${a.name}, ${i})
               on conflict (code) do update set name = excluded.name`;
    }
    // pastikan semua kode GL yang dipakai aset ada di master
    const known = new Set(parsed.glAccounts.map((a) => a.code));
    for (const code of new Set(parsed.assets.map((a) => a.gl_account).filter(Boolean) as string[])) {
      if (!known.has(code)) await tx`insert into gl_accounts (code, name) values (${code}, ${code}) on conflict do nothing`;
    }
    if (mode === "replace") await tx`delete from assets`;
    const rows = parsed.assets.map((a) => Object.fromEntries(COLS.map((c) => [c, (a as any)[c] ?? null])));
    for (let i = 0; i < rows.length; i += 200) {
      await tx`insert into assets ${tx(rows.slice(i, i + 200), ...COLS)}`;
    }
    return { inserted: rows.length };
  });
}
