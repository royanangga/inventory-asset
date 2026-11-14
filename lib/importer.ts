import type postgres from "postgres";
import type { ParsedWorkbook } from "./excel";

type Sql = postgres.Sql<any>;

// Detail inventory asset (kolom B-T) + tanggal jatuh tempo (diisi lewat website)
const COLS = [
  "gl_account","trans_no","vendor","project","ringgisho_no","po_no","div_plant","tgl","product_code","part_number",
  "item_name","qty","ringgisho_lc","kesaisho_sales","amount","claim_to","due_date","payment_status","source_row",
] as const;

// Claim ke customer (kolom W-AD + Remark/MVD)
const CLAIM_COLS = [
  "asset_id","claimed","trans_ref","expense_coa","sales_tooling","expense_amount","fa_amount","fa_date",
  "remark","mvd_status","mvd_note","note",
] as const;
const CLAIM_NUMS = new Set(["sales_tooling", "expense_amount", "fa_amount"]);

/** Kunci pencocokan aset lama ↔ baris Excel baru (PO + kode/part/nama + nilai), agar data dari website tidak hilang saat "Ganti semua data". */
const keyOf = (a: { po_no?: any; product_code?: any; part_number?: any; item_name?: any; amount?: any }) =>
  [a.po_no, a.product_code ?? a.part_number ?? a.item_name, Number(a.amount ?? 0)].map((x) => String(x ?? "").trim().toLowerCase()).join("|");

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

    // Simpan tanggal jatuh tempo & data claim yang diisi di website sebelum data lama diganti
    const keep = new Map<string, { due_date: string | null; payment_status: string | null; payments: any[]; claim: any } | null>();
    if (mode === "replace") {
      const old = await tx`select a.po_no, a.product_code, a.part_number, a.item_name, a.amount, a.due_date, a.payment_status,
        (select coalesce(json_agg(p order by p.id), '[]'::json) from asset_payments p where p.asset_id = a.id) as payments,
        (select row_to_json(c) from asset_claims c where c.asset_id = a.id) as claim from assets a`;
      for (const o of old) {
        const k = keyOf(o);
        keep.set(k, keep.has(k) ? null : { due_date: o.due_date ?? null, payment_status: o.payment_status ?? null, payments: o.payments ?? [], claim: o.claim ?? null }); // kunci ganda → abaikan
      }
      await tx`delete from assets`; // claim ikut terhapus (ON DELETE CASCADE)
    }

    let claims = 0, preserved = 0;
    for (let i = 0; i < parsed.assets.length; i += 200) {
      const chunk = parsed.assets.slice(i, i + 200);
      const kept = chunk.map((a) => keep.get(keyOf(a)) ?? null);
      const rows = chunk.map((a, k) => Object.fromEntries(COLS.map((c) => [c, c === "due_date" ? kept[k]?.due_date ?? null : c === "payment_status" ? kept[k]?.payment_status ?? "FINAL" : (a as any)[c] ?? null])));
      const ids = await tx`insert into assets ${tx(rows, ...COLS)} returning id`;
      // Riwayat pembayaran: pakai yang sudah ada di website (bila baris cocok), selain itu satu pembayaran FINAL sebesar nilai Excel
      const payRows = chunk.flatMap((a, k) => {
        const old = kept[k]?.payments ?? [];
        if (old.length) return old.map((p: any) => ({ asset_id: ids[k].id, stage: p.stage, amount: p.amount, pay_date: p.pay_date ?? null }));
        return [{ asset_id: ids[k].id, stage: "FINAL", amount: (a as any).amount ?? 0, pay_date: null }];
      });
      if (payRows.length) await tx`insert into asset_payments ${tx(payRows, "asset_id", "stage", "amount", "pay_date")}`;
      const claimRows = chunk.flatMap((a, k) => {
        const src = kept[k]?.claim ?? a.claim; // data claim dari website menang atas Excel
        if (kept[k]?.claim || kept[k]?.due_date || (kept[k]?.payment_status && kept[k]?.payment_status !== "FINAL")) preserved++;
        if (!src) return [];
        return [Object.fromEntries(CLAIM_COLS.map((c) => [c, c === "asset_id" ? ids[k].id : c === "claimed" ? !!src.claimed : (src as any)[c] ?? (CLAIM_NUMS.has(c) ? 0 : null)]))];
      });
      if (claimRows.length) {
        await tx`insert into asset_claims ${tx(claimRows, ...CLAIM_COLS)}`;
        claims += claimRows.length;
      }
    }
    return { inserted: parsed.assets.length, claims, preserved };
  });
}
