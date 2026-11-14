import Link from "next/link";
import { distinctValues, getAccounts, listAssets, CHECK_LABELS } from "../../../lib/queries";
import AssetsClient from "./AssetsClient";
import AssetFilters from "./AssetFilters";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

type SP = Promise<Record<string, string | undefined>>;

export default async function AssetsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const filters = { q: sp.q, gl: sp.gl, project: sp.project, plant: sp.plant, check: sp.check };
  const [{ rows, total, amount, qty }, accounts, vals] = await Promise.all([listAssets(filters, page, PAGE_SIZE), getAccounts(), distinctValues()]);
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
        <p className="text-sm text-slate-500">Detail inventory asset (sumber: sheet “Inventory asset per okt26”, kolom B–T).</p>
      </header>

      <AssetFilters accounts={accounts} projects={vals.projects} plants={vals.plants} total={total} amount={amount} />

      {sp.check && CHECK_LABELS[sp.check] && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 flex justify-between">
          <span>Menampilkan pemeriksaan: <b>{CHECK_LABELS[sp.check]}</b></span>
          <Link href="/assets" className="underline">Tutup</Link>
        </div>
      )}

      <AssetsClient rows={rows} accounts={accounts} exportQs={exportQs} totals={{ count: total, qty, amount }} />

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
