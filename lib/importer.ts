import type postgres from "postgres";
import type { ParsedWorkbook } from "./excel";

type Sql = postgres.Sql<any>;

// Detail inventory asset (kolom B-T)
const COLS = [
  "gl_account","trans_no","vendor","project","ringgisho_no","po_no","div_plant","tgl","product_code","part_number",
  "item_name","qty","ringgisho_lc","kesaisho_sales","amount","claim_to","source_row",
] as const;

// Claim ke customer (kolom W-AD + Remark/MVD)
const CLAIM_COLS = [
  "asset_id","due_date","trans_ref","expense_coa","sales_tooling","expense_amount","fa_amount","fa_date",
  "remark","mvd_status","mvd_note","note",
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
    if (mode === "replace") await tx`delete from assets`; // claim ikut terhapus (ON DELETE CASCADE)

    let claims = 0;
    for (let i = 0; i < parsed.assets.length; i += 200) {
      const chunk = parsed.assets.slice(i, i + 200);
      const rows = chunk.map((a) => Object.fromEntries(COLS.map((c) => [c, (a as any)[c] ?? null])));
      const ids = await tx`insert into assets ${tx(rows, ...COLS)} returning id`;
      const claimRows = chunk.flatMap((a, k) =>
        a.claim ? [Object.fromEntries(CLAIM_COLS.map((c) => [c, c === "asset_id" ? ids[k].id : (a.claim as any)[c] ?? (c === "sales_tooling" || c === "expense_amount" || c === "fa_amount" ? 0 : null)]))] : []);
      if (claimRows.length) {
        await tx`insert into asset_claims ${tx(claimRows, ...CLAIM_COLS)}`;
        claims += claimRows.length;
      }
    }
    return { inserted: parsed.assets.length, claims };
  });
}
