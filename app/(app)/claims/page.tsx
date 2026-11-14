import Link from "next/link";
import { claimCustomers, listClaims } from "../../../lib/queries";
import { fmt, fmtIdr } from "../../../lib/format";
import ClaimsClient from "./ClaimsClient";
import Stat from "../../../components/Stat";
import Ribbon from "../../../components/Ribbon";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;

export default async function ClaimsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = { q: sp.q, claim_to: sp.claim_to, status: sp.status };
  const [rows, customers] = await Promise.all([listClaims(filters), claimCustomers()]);
  const sum = (k: "amount" | "sales_tooling" | "expense_amount" | "fa_amount") => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const byCustomer = [...rows.reduce((m, r) => m.set(r.claim_to ?? "(tanpa customer)", (m.get(r.claim_to ?? "(tanpa customer)") ?? 0) + Number(r.amount ?? 0)), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, value: v }));
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="title">Claim Customer</h1>
        <p className="subtitle">Aset inventory yang sudah di-claim ke customer (bertanda sudah diclaim atau data kolom W-AD terisi).</p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Jumlah claim" value={fmt(rows.length)} money={false} />
        <Stat label="Inventory Asset" value={fmtIdr(sum("amount"))} />
        <Stat label="Expense" value={fmtIdr(sum("expense_amount"))} />
        <Stat label="FA Amount" value={fmtIdr(sum("fa_amount"))} />
      </section>

      {byCustomer.length > 1 && (
        <section className="card p-5">
          <h2 className="font-semibold tracking-tight mb-4">Nilai claim per customer</h2>
          <Ribbon segs={byCustomer} />
        </section>
      )}

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
