import Link from "next/link";
import { claimCustomers, listClaims } from "../../../lib/queries";
import { fmt, fmtIdr } from "../../../lib/format";
import ClaimsClient from "./ClaimsClient";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;

export default async function ClaimsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = { q: sp.q, claim_to: sp.claim_to, status: sp.status };
  const [rows, customers] = await Promise.all([listClaims(filters), claimCustomers()]);
  const sum = (k: "amount" | "sales_tooling" | "expense_amount" | "fa_amount") => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Claim Customer</h1>
        <p className="text-sm text-slate-500">
          Aset inventory yang sudah di-claim ke customer (ada tanggal jatuh tempo atau data kolom W-AD). {fmt(rows.length)} claim · Inventory Asset {fmtIdr(sum("amount"))} · Expense {fmtIdr(sum("expense_amount"))} · FA {fmtIdr(sum("fa_amount"))}
        </p>
      </header>

      <form className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]" method="get">
        <label><span className="label">Cari</span>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Vendor, PO, nama barang, trans, remark…" className="input mt-1" /></label>
        <label><span className="label">Claim ke</span>
          <select name="claim_to" defaultValue={sp.claim_to ?? ""} className="input mt-1">
            <option value="">Semua</option>
            {customers.map((c) => <option key={c}>{c}</option>)}
          </select></label>
        <label><span className="label">Jatuh tempo</span>
          <select name="status" defaultValue={sp.status ?? ""} className="input mt-1">
            <option value="">Semua yang diclaim</option>
            <option value="overdue">Sudah lewat</option>
            <option value="upcoming">Belum jatuh tempo</option>
            <option value="nodue">Diclaim, belum ada tanggal</option>
            <option value="notes">Hanya catatan (belum diclaim)</option>
            <option value="all">Semua (termasuk catatan)</option>
          </select></label>
        <div className="flex items-end gap-2">
          <button className="btn-primary">Terapkan</button>
          <Link href="/claims" className="btn">Reset</Link>
        </div>
      </form>

      <ClaimsClient rows={rows} exportQs={exportQs} />
    </div>
  );
}
