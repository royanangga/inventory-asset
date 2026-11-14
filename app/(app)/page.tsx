import Link from "next/link";
import { dashboardData } from "../../lib/queries";
import { fmt, fmtIdr, fmtDate } from "../../lib/format";
import Bars from "../../components/Bars";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const d = await dashboardData();
  const issues = d.checks.filter((c) => c.count > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Ringkasan daftar inventory asset yang tercatat di sistem.</p>
        </div>
        <Link href="/reconciliation" className="btn-primary">Rekonsiliasi dengan TB →</Link>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total Inventory Asset" value={fmtIdr(d.tot.amount)} strong />
        <Kpi label="Jumlah item" value={fmt(d.tot.items)} />
        <Kpi label="Project / model" value={fmt(d.tot.projects)} />
        <Kpi label="Vendor" value={fmt(d.tot.vendors)} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Per akun GL</h2>
          <Bars rows={d.byAccount.map((a) => ({ label: `${a.code} · ${a.name}`, amount: a.amount, sub: `${a.items} item`, href: `/assets?gl=${a.code}` }))} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Per Div#Plant</h2>
          <Bars rows={d.byPlant.map((a) => ({ label: a.plant, amount: a.amount, sub: `${a.items} item`, href: a.plant.startsWith("(") ? undefined : `/assets?plant=${encodeURIComponent(a.plant)}` }))} />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold mb-4">Per project / model</h2>
          <Bars rows={d.byProject.slice(0, 15).map((a) => ({ label: a.project, amount: a.amount, sub: `${a.items} item`, href: a.project.startsWith("(") ? undefined : `/assets?project=${encodeURIComponent(a.project)}` }))} />
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Pemeriksaan data</h2>
            {issues.length === 0 ? (
              <p className="text-sm text-emerald-700">Tidak ada masalah terdeteksi.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((c) => (
                  <li key={c.key}>
                    <Link href={`/assets?check=${c.key}`} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm hover:bg-amber-100">
                      <span className="text-amber-900">{c.label}</span>
                      <span className="font-semibold text-amber-900">{c.count} item</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Rekonsiliasi terakhir</h2>
            {d.lastRecon ? (
              <Link href={`/reconciliation/${d.lastRecon.id}`} className="block hover:opacity-80">
                <div className="font-medium">{d.lastRecon.title}</div>
                <div className="text-sm text-slate-500">Per {fmtDate(d.lastRecon.as_of)} · {d.lastRecon.status === "final" ? "Final" : "Draft"}</div>
              </Link>
            ) : (
              <p className="text-sm text-slate-500">Belum ada. Mulai dari menu Rekonsiliasi TB.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`card p-4 ${strong ? "col-span-2 lg:col-span-1 border-brand-100 bg-brand-50/50" : ""}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums ${strong ? "text-2xl text-brand-700" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
