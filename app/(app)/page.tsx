import Link from "next/link";
import { dashboardData, dueTimeline } from "../../lib/queries";
import { fmt, fmtDate, todayJakarta } from "../../lib/format";
import Bars from "../../components/Bars";
import CountUp from "../../components/CountUp";
import Ribbon from "../../components/Ribbon";
import Treemap from "../../components/Treemap";
import ClaimRadar from "../../components/ClaimRadar";
import Ring from "../../components/Ring";
import Seal from "../../components/Seal";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [d, timeline] = await Promise.all([dashboardData(), dueTimeline(45).catch(() => [])]);
  const today = todayJakarta();
  const issues = d.checks.filter((c) => c.count > 0);
  const items = Number(d.tot.items);
  const flagged = Math.min(issues.reduce((s, c) => s + c.count, 0), items);
  const score = items ? Math.round((1 - flagged / items) * 100) : 100;
  const tone = score >= 98 ? "good" : score >= 90 ? "warn" : "bad";
  const dateLabel = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <div className="space-y-6">
      <section className="ledger relative overflow-hidden rounded-[22px] border border-white/10 px-6 py-7 md:px-10 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/60">Total inventory asset · {dateLabel}</p>
            <h1 className="sr-only">Dashboard</h1>
          </div>
          <Link href="/reconciliation" className="btn !bg-white !text-[#111729] !border-transparent hover:!bg-white/90">Rekonsiliasi dengan TB</Link>
        </div>
        <div className="mt-4"><CountUp value={Number(d.tot.amount)} prefix="Rp " className="hero-num block" /></div>
        <p className="mt-4 text-sm text-white/65 tabular-nums">
          {fmt(items)} item dari {fmt(Number(d.tot.vendors))} vendor, tersebar di {fmt(Number(d.tot.projects))} project
        </p>
        <div className="mt-9">
          <Ribbon onDark segs={d.byAccount.map((a: any) => ({ key: a.code, label: a.name, sub: `${a.code} · ${a.items} item`, value: Number(a.amount), href: `/assets?gl=${a.code}` }))} />
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h2 className="font-semibold tracking-tight text-lg">Claim Radar</h2>
            <p className="text-sm text-slate-500">Kapan aset harus di-claim ke customer. Klik batang untuk membuka asetnya.</p>
          </div>
          <Link href="/assets?due=due" className="link">Lihat yang sudah jatuh tempo</Link>
        </div>
        <ClaimRadar rows={timeline} today={today} />
      </section>

      <section className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="card p-5 md:p-6 lg:col-span-2">
          <h2 className="font-semibold tracking-tight text-lg">Nilai aset per project</h2>
          <p className="text-sm text-slate-500 mb-4">Luas kotak mengikuti nilai aset.</p>
          <Treemap items={d.byProject.slice(0, 18).map((a: any) => ({
            label: a.project, value: Number(a.amount), sub: `${a.items} item`,
            href: String(a.project).startsWith("(") ? undefined : `/assets?project=${encodeURIComponent(a.project)}`,
          }))} />
        </div>
        <div className="space-y-6">
          <div className="card p-5 md:p-6">
            <h2 className="font-semibold tracking-tight text-lg mb-4">Kesehatan data</h2>
            <div className="flex items-center gap-5">
              <Ring value={score / 100} tone={tone} size={92}>
                <div><div className="text-2xl font-light tabular-nums leading-none">{score}</div><div className="text-[10px] text-slate-500 mt-0.5">dari 100</div></div>
              </Ring>
              <p className="text-sm text-slate-600">
                {issues.length === 0 ? "Tidak ada masalah terdeteksi. Semua aset punya akun GL, project, dan nilai yang wajar." : `${fmt(flagged)} dari ${fmt(items)} aset perlu diperiksa.`}
              </p>
            </div>
            {issues.length > 0 && (
              <ul className="mt-4 space-y-2">
                {issues.map((c) => (
                  <li key={c.key}>
                    <Link href={`/assets?check=${c.key}`} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm hover:brightness-95 transition">
                      <span className="text-amber-900">{c.label}</span>
                      <span className="font-semibold text-amber-900 tabular-nums">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-5 md:p-6">
            <h2 className="font-semibold tracking-tight text-lg mb-3">Rekonsiliasi terakhir</h2>
            {d.lastRecon ? (
              <Link href={`/reconciliation/${d.lastRecon.id}`} className="flex items-center gap-4 group">
                {d.lastRecon.status === "final" ? <Seal kind="date" size={64} mid={fmtDate(d.lastRecon.as_of)} /> : <span className="badge bg-amber-50 text-amber-700">Draft</span>}
                <div>
                  <div className="font-medium group-hover:underline underline-offset-4">{d.lastRecon.title}</div>
                  <div className="text-sm text-slate-500">Per {fmtDate(d.lastRecon.as_of)}</div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-slate-500">Belum ada. <Link href="/reconciliation" className="link">Mulai rekonsiliasi pertama</Link>.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <h2 className="font-semibold tracking-tight text-lg mb-4">Per Div#Plant</h2>
        <Bars rows={d.byPlant.map((a: any) => ({ label: a.plant, amount: Number(a.amount), sub: `${a.items} item`, href: String(a.plant).startsWith("(") ? undefined : `/assets?plant=${encodeURIComponent(a.plant)}` }))} />
      </section>
    </div>
  );
}
