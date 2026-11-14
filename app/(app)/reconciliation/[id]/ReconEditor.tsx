"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MoneyInput from "../../../../components/MoneyInput";
import Modal from "../../../../components/Modal";
import Seal from "../../../../components/Seal";
import Ring from "../../../../components/Ring";
import Stat from "../../../../components/Stat";
import { fmt, fmtDate } from "../../../../lib/format";
import { computeLine, findHints, round2, totals, type Adj, type LineInput, type LiteAsset } from "../../../../lib/recon";
import type { Recon } from "../../../../lib/reconData";

type Initial = { recon: Recon; lines: LineInput[]; adjustments: Adj[]; unassigned: { count: number; amount: number } };
type AdjRow = Adj & { key: string };

const STATUS = {
  empty: { text: "Belum diisi", cls: "bg-slate-100 text-slate-600" },
  match: { text: "Sesuai", cls: "bg-emerald-50 text-emerald-700" },
  explained: { text: "Selisih terjelaskan", cls: "bg-sky-50 text-sky-700" },
  diff: { text: "Ada selisih", cls: "bg-red-50 text-red-700" },
} as const;

let seq = 0;
const newKey = () => `n${++seq}`;

export default function ReconEditor({ initial, assets }: { initial: Initial; assets: LiteAsset[] }) {
  const router = useRouter();
  const { recon } = initial;
  const locked = recon.status === "final";

  const [title, setTitle] = useState(recon.title);
  const [asOf, setAsOf] = useState(recon.as_of);
  const [notes, setNotes] = useState(recon.notes ?? "");
  const [tb, setTb] = useState<Record<string, number | null>>(() => Object.fromEntries(initial.lines.map((l) => [l.gl_account, l.tb_balance])));
  const [adjs, setAdjs] = useState<AdjRow[]>(() => initial.adjustments.map((a) => ({ ...a, key: newKey() })));
  const [open, setOpen] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [addAcc, setAddAcc] = useState(false);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const results = useMemo(
    () => initial.lines.map((l) => computeLine({ ...l, tb_balance: tb[l.gl_account] ?? null }, adjs)),
    [initial.lines, tb, adjs]
  );
  const tot = useMemo(() => totals(results), [results]);
  const touch = () => { setDirty(true); setMsg(null); };

  function payload(extra: object = {}) {
    return {
      title, as_of: asOf, notes,
      lines: initial.lines.map((l) => ({ gl_account: l.gl_account, tb_balance: tb[l.gl_account] ?? null })),
      adjustments: adjs.filter((a) => a.description.trim() || a.amount).map(({ gl_account, description, amount }) => ({ gl_account, description, amount })),
      ...extra,
    };
  }

  async function save(extra: object = {}, okText = "Tersimpan") {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/reconciliations/${recon.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(extra)) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: j.error ?? "Gagal menyimpan" }); return false; }
    setDirty(false); setMsg({ ok: true, text: okText }); return true;
  }

  async function finalize() {
    const empty = results.filter((r) => r.status === "empty").length;
    const diff = results.filter((r) => r.status === "diff").length;
    const warn = [empty && `${empty} akun belum diisi`, diff && `${diff} akun masih ada selisih yang belum dijelaskan`].filter(Boolean).join(" dan ");
    if (!confirm(`${warn ? warn[0].toUpperCase() + warn.slice(1) + ". " : ""}Finalkan rekonsiliasi ini? Saldo sistem akan dikunci sebagai snapshot dan data tidak bisa diubah sampai dibuka kembali.`)) return;
    if (await save({ status: "final" }, "Rekonsiliasi difinalkan")) window.location.reload();
  }
  async function reopen() {
    if (!confirm("Buka kembali rekonsiliasi ini sebagai draft?")) return;
    setBusy(true);
    const res = await fetch(`/api/reconciliations/${recon.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "draft" }) });
    if (res.ok) window.location.reload(); else { setBusy(false); setMsg({ ok: false, text: "Gagal membuka kembali" }); }
  }
  async function remove() {
    if (!confirm("Hapus rekonsiliasi ini beserta penyesuaiannya?")) return;
    const res = await fetch(`/api/reconciliations/${recon.id}`, { method: "DELETE" });
    if (res.ok) { setDirty(false); router.push("/reconciliation"); }
  }

  const bigDiff = tot.filled > 0 && Math.abs(tot.diff) > 1;
  const okCount = results.filter((r) => r.status === "match" || r.status === "explained").length;
  const balanced = tot.total > 0 && results.every((r) => r.status === "match");
  const maxDiff = Math.max(...results.map((r) => Math.abs(r.diff ?? 0)), 1);

  return (
    <div className="space-y-5">
      <div className="text-sm"><Link href="/reconciliation" className="text-slate-500 hover:text-slate-800">← Semua rekonsiliasi</Link></div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 min-w-[260px] flex-1">
          <input value={title} disabled={locked} onChange={(e) => { setTitle(e.target.value); touch(); }} aria-label="Judul"
            className="title bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none w-full max-w-xl disabled:hover:border-transparent" />
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <label className="flex items-center gap-2">Posisi per
              <input type="date" value={asOf} disabled={locked} onChange={(e) => { setAsOf(e.target.value); touch(); }} className="input !w-auto !py-1" /></label>
            <span className={`badge ${locked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{locked ? `Final · ${fmtDate(recon.finalized_at)}` : "Draft"}</span>
            {dirty && <span className="text-amber-600">Belum disimpan</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {locked && <Seal kind="date" size={92} animate mid={fmtDate(recon.finalized_at)} title={`Rekonsiliasi final ${fmtDate(recon.finalized_at)}`} />}
          <a className="btn" href={`/api/reconciliations/${recon.id}/export`}>Ekspor Excel</a>
          {locked ? (
            <button className="btn" onClick={reopen} disabled={busy}>Buka kembali</button>
          ) : (
            <>
              <button className="btn-danger" onClick={remove}>Hapus</button>
              <button className="btn" onClick={() => save()} disabled={busy || !dirty}>{busy ? "Menyimpan…" : "Simpan"}</button>
              <button className="btn-primary" onClick={finalize} disabled={busy}>Finalkan</button>
            </>
          )}
        </div>
      </header>

      {msg && <div role="status" className={`rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total saldo TB (terisi)" value={tot.filled ? fmt(tot.tb) : "-"} sub={`${tot.filled} dari ${tot.total} akun`} />
        <Stat label="Total saldo sistem (akun terisi)" value={fmt(tot.sysFilled)} sub={`Seluruh akun: ${fmt(tot.sys)}`} />
        <Stat label="Selisih (TB − Sistem)" value={tot.filled ? fmt(tot.diff) : "-"} tone={!tot.filled ? undefined : bigDiff ? "bad" : "good"} sub={tot.filled ? (bigDiff ? "Perlu ditelusuri" : "Sesuai") : "Isi saldo TB dulu"} />
        <div className="card p-4 md:p-5 flex items-center gap-4">
          <Ring value={tot.total ? okCount / tot.total : 0} size={64} stroke={7} tone={okCount === tot.total && tot.total > 0 ? "good" : "brand"}>
            <span className="text-sm font-medium tabular-nums">{okCount}/{tot.total}</span>
          </Ring>
          <div><div className="text-xs font-medium text-slate-500">Akun sesuai</div><div className="text-xs text-slate-500 mt-1">{okCount === tot.total && tot.total > 0 ? "Semua akun beres" : `${tot.total - okCount} akun belum beres`}</div></div>
        </div>
      </section>

      {balanced && !locked && (
        <div className="rise rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-3" role="status">
          <Seal size={30} animate />
          <span><b>Semua akun seimbang.</b> Saldo TB sama dengan saldo sistem di setiap akun. Simpan, lalu finalkan untuk mengunci hasilnya.</span>
        </div>
      )}

      {tot.filled === tot.total && !bigDiff && results.some((r) => r.status === "diff") && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          <b>Total TB dan total sistem sudah sama</b> (selisih Rp {fmt(tot.diff)}), tetapi selisih per akun saling meniadakan. Biasanya ini berarti aset tercatat di akun GL yang berbeda dari TB —
          pindahkan akunnya lewat <Link className="underline" href="/assets">Daftar Aset</Link> (pilih baris → “Pindahkan ke akun GL”), atau catat sebagai penyesuaian.
        </div>
      )}

      {initial.unassigned.count > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          {initial.unassigned.count} aset senilai Rp {fmt(initial.unassigned.amount)} belum memiliki akun GL sehingga tidak ikut direkonsiliasi.{" "}
          <Link className="underline" href="/assets?check=nogl">Lihat aset</Link>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr>
              <th className="th">Akun GL</th>
              <th className="th text-right w-[230px]">Saldo TB (isi)</th>
              <th className="th text-right">Saldo Sistem</th>
              <th className="th text-right">Selisih</th>
              <th className="th text-right">Dijelaskan</th>
              <th className="th text-right">Belum dijelaskan</th>
              <th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isOpen = open === r.gl_account;
              const st = STATUS[r.status];
              return (
                <RowGroup key={r.gl_account}>
                  <tr className={`border-t border-slate-100 ${isOpen ? "bg-slate-50/70" : ""}`}>
                    <td className="td"><div className="font-medium">{r.gl_account}</div><div className="text-xs text-slate-500">{r.gl_name}</div></td>
                    <td className="td">
                      <MoneyInput label={`Saldo TB ${r.gl_account}`} value={tb[r.gl_account] ?? null} disabled={locked} placeholder="0"
                        onChange={(v) => { setTb({ ...tb, [r.gl_account]: v }); touch(); }} />
                    </td>
                    <td className="td num"><div className="amt">{fmt(r.system_balance)}</div><div className="text-xs text-slate-400">{r.system_count} item</div></td>
                    <td className="td num">
                      <div className={`font-medium amt ${r.diff && Math.abs(r.diff) > 1 ? "text-red-600" : ""}`}>{r.diff === null ? "-" : fmt(r.diff)}</div>
                      {r.diff !== null && <DiffBar diff={r.diff} max={maxDiff} unexplained={r.status === "diff"} />}
                    </td>
                    <td className="td num text-slate-600">{r.explained ? fmt(r.explained) : "-"}</td>
                    <td className={`td num ${r.status === "diff" ? "text-red-600 font-medium" : "text-slate-600"}`}>{r.unexplained === null ? "-" : fmt(r.unexplained)}</td>
                    <td className="td"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td className="td"><button className="link whitespace-nowrap" aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : r.gl_account)}>{isOpen ? "Tutup" : "Telusuri"}</button></td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/70"><td colSpan={8} className="px-4 pb-5 pt-1">
                      <Detail r={r} assets={assets} adjs={adjs} setAdjs={(a) => { setAdjs(a); touch(); }} locked={locked} />
                    </td></tr>
                  )}
                </RowGroup>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="td">Total</td>
              <td className="td num">{tot.filled ? fmt(tot.tb) : "-"}</td>
              <td className="td num">{fmt(tot.sysFilled)}</td>
              <td className={`td num ${bigDiff ? "text-red-600" : ""}`}>{tot.filled ? fmt(tot.diff) : "-"}</td>
              <td className="td num">{fmt(round2(results.reduce((s, r) => s + (r.tb_balance === null ? 0 : r.explained), 0)))}</td>
              <td className="td num">{fmt(round2(results.reduce((s, r) => s + (r.unexplained ?? 0), 0)))}</td>
              <td className="td" colSpan={2} />
            </tr>
          </tfoot>
        </table>
        {!locked && (
          <div className="px-4 py-3 border-t border-slate-100 text-sm">
            <button className="link" onClick={() => setAddAcc(true)}>+ Tambah akun GL</button>
          </div>
        )}
      </div>

      <div className="card p-5">
        <label className="label" htmlFor="notes">Catatan rekonsiliasi</label>
        <textarea id="notes" rows={3} value={notes} disabled={locked} onChange={(e) => { setNotes(e.target.value); touch(); }} className="input mt-1"
          placeholder="Mis. selisih Plant1/Plant2 karena reklasifikasi, menunggu jurnal koreksi…" />
      </div>

      {addAcc && <AddAccount onClose={() => setAddAcc(false)} onDone={async () => {
        if (dirty) await save();
        window.location.reload();
      }} />}
    </div>
  );
}

const RowGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;

/** Batang selisih dua arah dari titik nol: kanan = TB lebih besar, kiri = sistem lebih besar. */
function DiffBar({ diff, max, unexplained }: { diff: number; max: number; unexplained: boolean }) {
  const w = Math.min(Math.abs(diff) / max, 1) * 50;
  const color = Math.abs(diff) <= 1 ? "var(--e600)" : unexplained ? "var(--r500)" : "var(--k700)";
  return (
    <div className="relative mt-1.5 ml-auto h-1.5 w-28 rounded-full bg-slate-100" aria-hidden="true">
      <span className="absolute inset-y-[-2px] left-1/2 w-px bg-slate-300" />
      {Math.abs(diff) > 1
        ? <span className="absolute inset-y-0 rounded-full transition-all duration-500" style={{ background: color, width: `${Math.max(w, 3)}%`, left: diff > 0 ? "50%" : undefined, right: diff < 0 ? "50%" : undefined }} />
        : <span className="absolute -top-px left-1/2 -ml-[3px] h-2 w-2 rounded-full" style={{ background: color }} />}
    </div>
  );
}

function Detail({ r, assets, adjs, setAdjs, locked }: {
  r: ReturnType<typeof computeLine>; assets: LiteAsset[]; adjs: AdjRow[]; setAdjs: (a: AdjRow[]) => void; locked: boolean;
}) {
  const mine = useMemo(() => assets.filter((a) => a.gl_account === r.gl_account), [assets, r.gl_account]);
  const byProject = useMemo(() => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const a of mine) { const k = a.project ?? "(tanpa project)"; const g = m.get(k) ?? { amount: 0, count: 0 }; g.amount += a.amount; g.count++; m.set(k, g); }
    return [...m].sort((a, b) => b[1].amount - a[1].amount);
  }, [mine]);
  const hints = useMemo(() => (r.diff !== null && Math.abs(r.diff) > 1 ? findHints(r.gl_account, r.diff, assets) : []), [r, assets]);
  const mineAdjs = adjs.filter((a) => a.gl_account === r.gl_account);
  const [showItems, setShowItems] = useState(false);

  const upd = (key: string, patch: Partial<AdjRow>) => setAdjs(adjs.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  const add = (amount = 0) => setAdjs([...adjs, { key: newKey(), gl_account: r.gl_account, description: "", amount }]);

  return (
    <div className="grid lg:grid-cols-2 gap-5 pt-3">
      <div className="space-y-5">
        {r.diff !== null && Math.abs(r.diff) > 1 && (
          <section>
            <h3 className="text-sm font-semibold mb-2">Petunjuk penyebab selisih</h3>
            {hints.length ? (
              <ul className="space-y-1.5 text-sm">
                {hints.map((h, i) => <li key={i} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900">{h.text}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Tidak ada project atau item yang nilainya sama persis dengan selisih {fmt(Math.abs(r.diff))}. Periksa rincian di bawah atau tambahkan penyesuaian manual.</p>
            )}
            <p className="text-xs text-slate-400 mt-2">Petunjuk berdasarkan kecocokan nilai saja — pastikan dengan dokumen sumber.</p>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Penyesuaian / penjelasan selisih</h3>
            {!locked && <button className="btn !py-1 !px-2.5 text-xs" onClick={() => add(r.unexplained && Math.abs(r.unexplained) > 1 ? r.unexplained : 0)}>+ Tambah{r.unexplained && Math.abs(r.unexplained) > 1 ? " (isi sisa)" : ""}</button>}
          </div>
          {mineAdjs.length === 0 && <p className="text-sm text-slate-500">Belum ada penyesuaian. Tambahkan bila selisih bisa dijelaskan, mis. jurnal belum diposting atau reklasifikasi antar akun.</p>}
          <ul className="space-y-2">
            {mineAdjs.map((a) => (
              <li key={a.key} className="grid grid-cols-[1fr_150px_auto] gap-2 items-center">
                <input className="input" placeholder="Keterangan" aria-label="Keterangan penyesuaian" value={a.description} disabled={locked} onChange={(e) => upd(a.key, { description: e.target.value })} />
                <MoneyInput label="Nilai penyesuaian" value={a.amount} disabled={locked} onChange={(v) => upd(a.key, { amount: v ?? 0 })} />
                {!locked && <button aria-label="Hapus penyesuaian" className="text-slate-400 hover:text-red-600 text-lg px-1 cursor-pointer" onClick={() => setAdjs(adjs.filter((x) => x.key !== a.key))}>×</button>}
              </li>
            ))}
          </ul>
          {mineAdjs.length > 0 && <p className="text-xs text-slate-400 mt-2">Nilai penyesuaian searah selisih (TB − Sistem): positif bila TB lebih besar dari sistem.</p>}
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Rincian aset di sistem{locked ? " (kondisi saat ini)" : ""}</h3>
          <Link className="link !text-xs" href={`/assets?gl=${r.gl_account}`}>Buka di Daftar Aset →</Link>
        </div>
        {mine.length === 0 ? <p className="text-sm text-slate-500">Tidak ada aset pada akun ini.</p> : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead><tr><th className="th">Project</th><th className="th text-right">Item</th><th className="th text-right">Nilai</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {byProject.map(([p, g]) => <tr key={p}><td className="td !py-1.5">{p}</td><td className="td !py-1.5 num text-slate-500">{g.count}</td><td className="td !py-1.5 num">{fmt(g.amount)}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
        {mine.length > 0 && <button className="link mt-3" onClick={() => setShowItems(true)}>Lihat {mine.length} item</button>}
      </section>

      {showItems && (
        <Modal title={`Item akun ${r.gl_account} — ${r.gl_name}`} onClose={() => setShowItems(false)} wide>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0"><tr><th className="th">Vendor</th><th className="th">Project</th><th className="th">Nama Barang</th><th className="th text-right">Nilai</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {mine.map((a) => <tr key={a.id}><td className="td !py-1.5">{a.vendor}</td><td className="td !py-1.5 whitespace-nowrap">{a.project}</td><td className="td !py-1.5">{a.item_name ?? a.product_code}</td><td className="td !py-1.5 num">{fmt(a.amount)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddAccount({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/gl-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) });
    if (res.ok) return onDone();
    setErr((await res.json().catch(() => ({}))).error ?? "Gagal"); setBusy(false);
  }
  return (
    <Modal title="Tambah akun GL" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="label">Kode akun</span><input className="input mt-1" value={code} onChange={(e) => setCode(e.target.value)} placeholder="1135005" /></label>
        <label className="block"><span className="label">Nama akun</span><input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Inventory Asset (Plant5)" /></label>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Batal</button><button className="btn-primary" disabled={busy || !code || !name}>Simpan</button></div>
      </form>
    </Modal>
  );
}
