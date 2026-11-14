import Link from "next/link";
import { distinctValues, getAccounts, listAssets, CHECK_LABELS } from "../../../lib/queries";
import { fmt, fmtIdr } from "../../../lib/format";
import AssetsClient from "./AssetsClient";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

type SP = Promise<Record<string, string | undefined>>;

export default async function AssetsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const filters = { q: sp.q, gl: sp.gl, project: sp.project, plant: sp.plant, check: sp.check };
  const [{ rows, total, amount }, accounts, vals] = await Promise.all([listAssets(filters, page, PAGE_SIZE), getAccounts(), distinctValues()]);
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) u.set(k, v);
    if (p > 1) u.set("page", String(p));
    return `/assets?${u.toString()}`;
  };
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Daftar Aset</h1>
        <p className="text-sm text-slate-500">Sumber: sheet “Inventory asset per okt26”. {fmt(total)} item · {fmtIdr(amount)}</p>
      </header>

      <form className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" method="get">
        <label><span className="label">Cari</span>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Vendor, PO, part number, nama barang…" className="input mt-1" /></label>
        <label><span className="label">Akun GL</span>
          <select name="gl" defaultValue={sp.gl ?? ""} className="input mt-1">
            <option value="">Semua</option>
            {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            <option value="none">(tanpa akun)</option>
          </select></label>
        <label><span className="label">Project</span>
          <select name="project" defaultValue={sp.project ?? ""} className="input mt-1">
            <option value="">Semua</option>
            {vals.projects.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <label><span className="label">Div#Plant</span>
          <select name="plant" defaultValue={sp.plant ?? ""} className="input mt-1">
            <option value="">Semua</option>
            {vals.plants.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <div className="flex items-end gap-2">
          <button className="btn-primary">Terapkan</button>
          <Link href="/assets" className="btn">Reset</Link>
        </div>
        {sp.check && <input type="hidden" name="check" value={sp.check} />}
      </form>

      {sp.check && CHECK_LABELS[sp.check] && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 flex justify-between">
          <span>Menampilkan pemeriksaan: <b>{CHECK_LABELS[sp.check]}</b></span>
          <Link href="/assets" className="underline">Tutup</Link>
        </div>
      )}

      <AssetsClient rows={rows} accounts={accounts} exportQs={exportQs} />

      <nav className="flex items-center justify-between text-sm text-slate-600" aria-label="Halaman">
        <span>Halaman {page} dari {pages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link className="btn" href={qs(page - 1)}>← Sebelumnya</Link>}
          {page < pages && <Link className="btn" href={qs(page + 1)}>Berikutnya →</Link>}
        </div>
      </nav>
    </div>
  );
}
