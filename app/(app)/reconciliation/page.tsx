import Link from "next/link";
import { listRecons } from "../../../lib/reconData";
import { fmt, fmtDate } from "../../../lib/format";
import NewRecon from "./NewRecon";

export const dynamic = "force-dynamic";

export default async function ReconList() {
  const list = await listRecons();
  const lastMonthEnd = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 0));
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const defTitle = `Rekonsiliasi ${months[lastMonthEnd.getUTCMonth()]} ${lastMonthEnd.getUTCFullYear()}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rekonsiliasi TB</h1>
        <p className="text-sm text-slate-500 max-w-2xl">Isi saldo Trial Balance per akun GL, lalu sistem membandingkannya dengan total daftar aset dan menunjukkan selisihnya.</p>
      </header>

      <NewRecon defaultTitle={defTitle} defaultDate={lastMonthEnd.toISOString().slice(0, 10)} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead><tr><th className="th">Judul</th><th className="th">Posisi per</th><th className="th text-right">Total saldo TB</th><th className="th">Akun terisi</th><th className="th">Status</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 && <tr><td colSpan={6} className="td text-center text-slate-500 py-10">Belum ada rekonsiliasi. Buat yang pertama di atas.</td></tr>}
            {list.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="td font-medium"><Link href={`/reconciliation/${r.id}`} className="hover:underline">{r.title}</Link></td>
                <td className="td">{fmtDate(r.as_of)}</td>
                <td className="td num">{r.filled ? fmt(r.tb_total) : "-"}</td>
                <td className="td">{r.filled} akun</td>
                <td className="td"><span className={`badge ${r.status === "final" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.status === "final" ? "Final" : "Draft"}</span></td>
                <td className="td"><Link href={`/reconciliation/${r.id}`} className="text-brand-600 text-sm hover:underline">Buka</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
