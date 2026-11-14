"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../../../components/Modal";
import { DUE_SOON_DAYS, daysUntil, fmt, fmtDate, todayJakarta } from "../../../lib/format";
import ClaimModal, { type ClaimTarget } from "../../../components/ClaimModal";
import Seal from "../../../components/Seal";
import ConfirmDialog, { type Change, type ConfirmProps } from "../../../components/ConfirmDialog";
import { diffForm, listForm, type FieldDef } from "../../../lib/diff";
import { PAYMENT_STATUSES, latestStage, stageIndex, type AssetPayment, type AssetRow, type Claim, type GlAccount } from "../../../lib/types";

type Form = Record<string, string>;
const EMPTY: Form = {
  gl_account: "", vendor: "", project: "", po_no: "", ringgisho_no: "", div_plant: "", tgl: "", trans_no: "", product_code: "", part_number: "",
  item_name: "", qty: "1", ringgisho_lc: "0", kesaisho_sales: "0", amount: "0", claim_to: "", due_date: "", payment_status: "FINAL", payment_amount: "", payment_date: "",
};

function toForm(a: AssetRow): Form {
  const f: Form = {};
  for (const k of Object.keys(EMPTY)) f[k] = (a as any)[k] === null || (a as any)[k] === undefined ? "" : String((a as any)[k]);
  return f;
}

const assetDefs = (accName: Record<string, string>): FieldDef[] => [
  { key: "gl_account", label: "Akun GL", show: (v) => (accName[v] ? `${v} · ${accName[v]}` : v) },
  { key: "project", label: "Project / Model" }, { key: "div_plant", label: "Div#Plant" },
  { key: "vendor", label: "Vendor" }, { key: "tgl", label: "Tanggal", kind: "date" },
  { key: "po_no", label: "PO" }, { key: "ringgisho_no", label: "No. Ringgisho" }, { key: "trans_no", label: "Trans" },
  { key: "product_code", label: "Product Code" }, { key: "part_number", label: "Part Number" }, { key: "item_name", label: "Nama Barang" },
  { key: "qty", label: "Qty", kind: "num" }, { key: "ringgisho_lc", label: "Ringgisho PUR (LC)", kind: "num" },
  { key: "kesaisho_sales", label: "Kesaisho - Sales", kind: "num" },
  { key: "claim_to", label: "Customer MVD" }, { key: "due_date", label: "Tanggal jatuh tempo", kind: "date" },
];

export default function AssetsClient({ rows, accounts, exportQs, totals }: { rows: AssetRow[]; accounts: GlAccount[]; exportQs: string; totals: { count: number; qty: number; amount: number } }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [edit, setEdit] = useState<{ id: number | null; form: Form } | null>(null);
  const [claim, setClaim] = useState<ClaimTarget | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [bulkGl, setBulkGl] = useState("");
  const [bulkDue, setBulkDue] = useState("");
  const today = todayJakarta();
  const [msg, setMsg] = useState("");
  const [confirmBulk, setConfirmBulk] = useState<ConfirmProps | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => { try { setCompact(localStorage.getItem("density") === "compact"); } catch { /* abaikan */ } }, []);
  const toggleDensity = () => setCompact((c) => { const n = !c; try { localStorage.setItem("density", n ? "compact" : "comfy"); } catch { /* abaikan */ } return n; });
  const accName = useMemo(() => Object.fromEntries(accounts.map((a) => [a.code, a.name])), [accounts]);

  const selRows = rows.filter((r) => sel.has(r.id));
  const allSelected = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function openClaim(r: AssetRow) {
    let existing: Claim | null = null;
    if (r.claim_id) {
      const res = await fetch(`/api/claims/${r.claim_id}`);
      if (res.ok) existing = await res.json();
    }
    setClaim({ assetId: r.id, title: [r.vendor, r.item_name].filter(Boolean).join(" · "), amount: r.amount, claimTo: r.claim_to, dueDate: r.due_date, claim: existing });
  }

  /** Jalankan aksi massal; kembalikan teks error bila gagal (dipakai dialog konfirmasi). */
  async function bulk(body: object, okMsg: (n: number) => string): Promise<string | void> {
    setMsg("");
    const res = await fetch("/api/assets/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...sel], ...body }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return j.error ?? "Gagal";
    setConfirmBulk(null); setMsg(okMsg(j.affected)); setSel(new Set()); setBulkGl(""); setBulkDue(""); router.refresh();
  }
  const itemLabel = (r: AssetRow) => [r.vendor, r.item_name].filter(Boolean).join(" · ") || `Aset #${r.id}`;
  const askBulk = (kind: "update" | "delete", title: string, summary: string, detail: (r: AssetRow) => string, body: object, okMsg: (n: number) => string, note?: string) =>
    setConfirmBulk({
      kind, title, summary, note,
      items: selRows.map((r) => ({ primary: itemLabel(r), secondary: [r.po_no, r.part_number].filter(Boolean).join(" · "), detail: detail(r) })),
      onConfirm: () => bulk(body, okMsg), onCancel: () => setConfirmBulk(null),
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => setEdit({ id: null, form: { ...EMPTY } })}>+ Tambah aset</button>
        <button className="btn" onClick={() => setShowImport(true)}>Impor Excel</button>
        <a className="btn" href={`/api/assets/export?${exportQs}`}>Ekspor Excel</a>
        {msg && <span className="text-sm text-emerald-700 ml-2" role="status">{msg}</span>}
        <button className="btn ml-auto" onClick={toggleDensity} aria-pressed={compact} title="Ubah kerapatan baris">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{compact ? <path d="M4 5h16M4 10h16M4 15h16M4 20h16" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
          {compact ? "Rapat" : "Lega"}
        </button>
      </div>

      {sel.size > 0 && (
        <div className="rise card fixed bottom-4 inset-x-4 md:left-[16rem] md:right-8 z-40 flex flex-wrap items-center gap-3 px-4 py-3" style={{ boxShadow: "0 24px 60px -18px rgba(10,15,40,0.55)", borderColor: "var(--b500)" }} role="region" aria-label="Aksi untuk aset terpilih">
          <span className="text-sm font-medium"><b>{sel.size}</b> dipilih · <span className="tabular-nums amt">Rp {fmt(rows.filter((r) => sel.has(r.id)).reduce((t, r) => t + r.amount, 0))}</span></span>
          <select value={bulkGl} onChange={(e) => setBulkGl(e.target.value)} className="input !w-auto" aria-label="Akun GL tujuan">
            <option value="">Pindahkan ke akun GL…</option>
            {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
          <button className="btn-primary" disabled={!bulkGl}
            onClick={() => askBulk("update", `Pindahkan ${sel.size} aset ke akun GL baru`, `Akun GL tujuan: ${bulkGl}${accName[bulkGl] ? " · " + accName[bulkGl] : ""}`,
              (r) => `${r.gl_account ?? "kosong"} → ${bulkGl}`, { gl_account: bulkGl }, (n) => `${n} aset dipindahkan ke ${bulkGl}`)}>Terapkan</button>
          <input type="date" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} className="input !w-auto" aria-label="Tanggal jatuh tempo" />
          <button className="btn-primary" disabled={!bulkDue}
            onClick={() => askBulk("update", `Atur jatuh tempo ${sel.size} aset`, `Tanggal jatuh tempo baru: ${fmtDate(bulkDue)}`,
              (r) => `${fmtDate(r.due_date)} → ${fmtDate(bulkDue)}`, { action: "due", due_date: bulkDue }, (n) => `Jatuh tempo ${n} aset diatur ke ${fmtDate(bulkDue)}`)}>Atur jatuh tempo</button>
          <button className="btn-danger"
            onClick={() => askBulk("delete", `Hapus ${sel.size} aset`, `Total nilai Rp ${fmt(selRows.reduce((t, r) => t + r.amount, 0))} akan dihapus dari daftar aset.`,
              (r) => `Rp ${fmt(r.amount)}`, { action: "delete" }, (n) => `${n} aset dihapus`, "Tindakan ini tidak bisa dibatalkan.")}>Hapus</button>
          <button className="btn" onClick={() => setSel(new Set())}>Batal pilih</button>
        </div>
      )}

      <div className={`card overflow-x-auto ${compact ? "density-compact" : ""}`}>
        <table className="w-full min-w-[960px] text-[13px]">
          <thead>
            <tr>
              <th className="th w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua" /></th>
              <th className="th">GL</th><th className="th">Vendor / Project</th><th className="th">PO / Tgl</th>
              <th className="th">Kode / Part</th><th className="th">Nama Barang</th>
              <th className="th text-right">Qty</th><th className="th text-right">Inventory Asset</th><th className="th">Pembayaran</th><th className="th">Jatuh tempo</th><th className="th">Claim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={11} className="td text-center text-slate-500 py-10">Tidak ada data yang cocok.</td></tr>}
            {rows.map((r) => {
              const days = r.due_date ? daysUntil(r.due_date, today) : null;
              const isDue = !r.claimed && days !== null && days <= 0;
              const isSoon = !r.claimed && days !== null && days > 0 && days <= DUE_SOON_DAYS;
              return (
              <tr key={r.id} tabIndex={0} role="button" aria-label={`Buka data aset ${itemLabel(r)}`}
                className={`cursor-pointer ${sel.has(r.id) ? "bg-brand-50/50" : isDue ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/70"}`}
                onClick={() => setEdit({ id: r.id, form: toForm(r) })}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEdit({ id: r.id, form: toForm(r) }); } }}>
                <td className="td" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Pilih aset ${r.id}`} /></td>
                <td className="td whitespace-nowrap" title={r.gl_account ? accName[r.gl_account] : ""}>
                  {r.gl_account ?? <span className="badge bg-red-50 text-red-700">kosong</span>}</td>
                <td className="td min-w-[170px]"><div>{r.vendor}</div><div className="text-xs text-slate-500">{r.project}</div></td>
                <td className="td whitespace-nowrap text-slate-600"><div>{r.po_no}</div><div className="text-xs text-slate-400">{fmtDate(r.tgl)}</div></td>
                <td className="td text-slate-600 whitespace-nowrap"><div>{r.product_code}</div><div className="text-xs text-slate-400">{r.part_number}</div></td>
                <td className="td min-w-[200px]">{r.item_name}{r.claim_to && <div className="mt-1"><span className="badge bg-slate-100 text-slate-700">{r.claim_to}</span></div>}</td>
                <td className="td num">{fmt(r.qty)}</td>
                <td className={`td num font-medium amt ${r.amount < 0 ? "text-red-600" : ""}`}>{fmt(r.amount)}</td>
                <td className="td whitespace-nowrap">
                  <span className={`badge ${r.payment_status === "FINAL" ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{r.payment_status}</span>
                </td>
                <td className="td whitespace-nowrap">
                  {days === null ? <span className="text-slate-400">-</span> : (
                    <>
                      <div className={r.claimed ? "text-slate-500" : isDue ? "font-medium text-red-700" : ""}>{fmtDate(r.due_date)}</div>
                      {isDue && <span className="badge bg-red-100 text-red-700">{days < 0 ? `Lewat ${-days} hari` : "Jatuh tempo hari ini"}</span>}
                      {isSoon && <span className="badge bg-amber-100 text-amber-800">{days} hari lagi</span>}
                    </>
                  )}
                </td>
                <td className="td whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {r.claimed
                    ? <button className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:underline underline-offset-4" style={{ color: "var(--stamp)" }} onClick={() => openClaim(r)} title="Lihat / ubah claim"><Seal size={20} />Diclaim</button>
                    : isDue
                      ? <button className="btn-danger !py-1 !px-2.5 text-xs" onClick={() => openClaim(r)}>Claim sekarang</button>
                    : r.claim_id
                      ? <button className="badge bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => openClaim(r)} title="Ada catatan Remark/MVD, belum diclaim">Catatan</button>
                      : <button className="link" onClick={() => openClaim(r)}>Claim</button>}
                </td>
              </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
              {sel.size > 0 && (
                <tr className="text-brand-600">
                  <td className="td" colSpan={6}>Dipilih ({fmt(sel.size)} baris)</td>
                  <td className="td num">{fmt(selRows.reduce((t, r) => t + Number(r.qty), 0))}</td>
                  <td className="td num amt">{fmt(selRows.reduce((t, r) => t + Number(r.amount), 0))}</td>
                  <td className="td" colSpan={3} />
                </tr>
              )}
              <tr>
                <td className="td" colSpan={6}>Subtotal halaman ini ({fmt(rows.length)} baris)</td>
                <td className="td num">{fmt(rows.reduce((t, r) => t + Number(r.qty), 0))}</td>
                <td className="td num amt">{fmt(rows.reduce((t, r) => t + Number(r.amount), 0))}</td>
                <td className="td" colSpan={3} />
              </tr>
              <tr>
                <td className="td" colSpan={6}>Total semua hasil filter ({fmt(totals.count)} item)</td>
                <td className="td num">{fmt(totals.qty)}</td>
                <td className="td num amt">{fmt(totals.amount)}</td>
                <td className="td" colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {confirmBulk && <ConfirmDialog {...confirmBulk} />}
      {edit && <AssetModal edit={edit} accounts={accounts} accName={accName} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} onRefresh={() => router.refresh()} />}
      {claim && <ClaimModal target={claim} onClose={() => setClaim(null)} onSaved={() => { setClaim(null); router.refresh(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); router.refresh(); }} />}
    </>
  );
}

function AssetModal({ edit, accounts, accName, onClose, onSaved, onRefresh }: { edit: { id: number | null; form: Form }; accounts: GlAccount[]; accName: Record<string, string>; onClose: () => void; onSaved: () => void; onRefresh: () => void }) {
  const [f, setF] = useState<Form>(edit.form);
  const [err, setErr] = useState("");
  const [confirmAsk, setConfirmAsk] = useState<ConfirmProps | null>(null);
  const defs = useMemo(() => assetDefs(accName), [accName]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const title = [edit.form.vendor, edit.form.item_name].filter(Boolean).join(" · ");
  const [paid, setPaid] = useState<{ amount: number; status: string }>({ amount: Number(edit.form.amount) || 0, status: edit.form.payment_status });

  /** Form disubmit → tampilkan konfirmasi berisi rincian perubahan, baru simpan. */
  function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const run = async (): Promise<string | void> => {
      const res = await fetch(edit.id ? `/api/assets/${edit.id}` : "/api/assets", { method: edit.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (res.ok) return onSaved();
      return (await res.json().catch(() => ({}))).error ?? "Gagal menyimpan";
    };
    if (edit.id) {
      const changes = diffForm(defs, edit.form, f);
      if (changes.length === 0) { setErr("Belum ada data yang diubah."); return; }
      setConfirmAsk({ kind: "update", title: "Simpan perubahan aset?", summary: `${changes.length} data akan diubah${title ? ` pada ${title}` : ""}.`, changes, onConfirm: run, onCancel: () => setConfirmAsk(null) });
    } else {
      const nominal = Number(f.payment_amount);
      if (f.payment_amount.trim() === "" || !Number.isFinite(nominal)) { setErr(`Isi nominal ${f.payment_status}.`); return; }
      const changes = [
        ...listForm(defs, f, "after"),
        { label: "Status pembayaran", after: f.payment_status },
        { label: `Nominal ${f.payment_status}`, after: `Rp ${fmt(nominal)}${f.payment_date ? " · " + fmtDate(f.payment_date) : ""}` },
        { label: "Inventory Asset (Purchase)", after: `Rp ${fmt(nominal)}` },
      ];
      setConfirmAsk({ kind: "create", title: "Tambah aset baru?", summary: `Nominal ${f.payment_status} otomatis menjadi Inventory Asset (Purchase).`, changes, onConfirm: run, onCancel: () => setConfirmAsk(null) });
    }
  }
  function del() {
    if (!edit.id) return;
    setConfirmAsk({
      kind: "delete", title: "Hapus aset ini?", summary: title || `Aset #${edit.id}`, changes: [...listForm(defs, edit.form, "before"), { label: "Status pembayaran", before: paid.status }, { label: "Inventory Asset (Purchase)", before: `Rp ${fmt(paid.amount)}` }],
      note: "Aset beserta seluruh riwayat pembayarannya akan dihapus. Tindakan ini tidak bisa dibatalkan.",
      onConfirm: async () => {
        const res = await fetch(`/api/assets/${edit.id}`, { method: "DELETE" });
        if (res.ok) return onSaved();
        return "Gagal menghapus";
      },
      onCancel: () => setConfirmAsk(null),
    });
  }
  const T = (k: string, label: string, type = "text", cls = "") => (
    <label className={cls}><span className="label">{label}</span><input type={type} value={f[k]} onChange={set(k)} className="input mt-1" step={type === "number" ? "any" : undefined} /></label>
  );

  return (
    <Modal title={edit.id ? "Ubah aset" : "Tambah aset"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label><span className="label">Akun GL</span>
            <select value={f.gl_account} onChange={set("gl_account")} className="input mt-1">
              <option value="">(kosong)</option>
              {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            </select></label>
          {T("project", "Project / Model")}
          {T("div_plant", "Div#Plant")}
          {T("vendor", "Vendor", "text", "sm:col-span-2")}
          {T("tgl", "Tanggal", "date")}
          {T("po_no", "PO")}
          {T("ringgisho_no", "No. Ringgisho")}
          {T("trans_no", "Trans")}
          {T("product_code", "Product Code")}
          {T("part_number", "Part Number")}
          {T("item_name", "Nama Barang", "text", "sm:col-span-3")}
          {T("qty", "Qty", "number")}
          {T("ringgisho_lc", "Ringgisho PUR (LC)", "number")}
          {T("kesaisho_sales", "Kesaisho - Sales", "number")}
          {T("claim_to", "Customer MVD (Claim ADM / TBINA)", "text", "sm:col-span-2")}
          {T("due_date", "Tanggal jatuh tempo (saatnya di-claim)", "date")}
        </div>

        {edit.id ? (
          <PaymentsPanel assetId={edit.id} ask={setConfirmAsk} onChanged={(a) => { setPaid(a); onRefresh(); }} />
        ) : (
          <fieldset className="rounded-lg border border-slate-200 p-4 space-y-3">
            <legend className="px-1 text-sm font-semibold">Pembayaran</legend>
            <div className="grid sm:grid-cols-3 gap-3">
              <label><span className="label">Status pembayaran</span>
                <select value={f.payment_status} onChange={set("payment_status")} className="input mt-1">
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
              {T("payment_amount", `Nominal ${f.payment_status}`, "number")}
              {T("payment_date", "Tanggal bayar (opsional)", "date")}
            </div>
            <p className="text-xs text-slate-500">Nominal ini otomatis menjadi <b>Inventory Asset (Purchase)</b>. Bila memilih DP, tahap berikutnya (DP 2, dst. sampai FINAL) bisa ditambahkan setelah aset disimpan, dan nominalnya dijumlahkan otomatis.</p>
          </fieldset>
        )}
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex justify-between pt-1">
          <div>{edit.id && <button type="button" className="btn-danger" onClick={del}>Hapus</button>}</div>
          <div className="flex gap-2"><button type="button" className="btn" onClick={onClose}>Batal</button><button className="btn-primary">Simpan</button></div>
        </div>
      </form>
      {confirmAsk && <ConfirmDialog {...confirmAsk} />}
    </Modal>
  );
}

const rp = (n: number) => `Rp ${fmt(n)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const stageBadge = (s: string) => `badge ${s === "FINAL" ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"}`;

/** Riwayat pembayaran aset (DP 1, DP 2, … FINAL). Total semua nominal = Inventory Asset (Purchase). */
function PaymentsPanel({ assetId, ask, onChanged }: { assetId: number; ask: (c: ConfirmProps | null) => void; onChanged: (a: { amount: number; status: string }) => void }) {
  const [pays, setPays] = useState<AssetPayment[] | null>(null);
  const [form, setForm] = useState<{ id: number | null; stage: string; amount: string; pay_date: string } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/assets/${assetId}/payments`);
    if (r.ok) setPays(await r.json()); else setErr("Gagal memuat pembayaran");
  }, [assetId]);
  useEffect(() => { load(); }, [load]);

  const list = pays ?? [];
  const total = round2(list.reduce((t, p) => t + Number(p.amount), 0));
  const status = latestStage(list.map((p) => p.stage));
  const hasFinal = list.some((p) => p.stage === "FINAL");
  const used = new Set(list.map((p) => p.stage));
  const nextStage = PAYMENT_STATUSES.find((s) => !used.has(s) && stageIndex(s) > stageIndex(status)) ?? PAYMENT_STATUSES.find((s) => !used.has(s)) ?? "FINAL";

  const after = async (res: Response, fail: string): Promise<string | void> => {
    if (!res.ok) return (await res.json().catch(() => ({}))).error ?? fail;
    const a = await res.json();
    setForm(null); ask(null); await load();
    onChanged({ amount: Number(a.amount), status: a.payment_status });
  };

  function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!form) return;
    const amt = Number(form.amount);
    if (form.amount.trim() === "" || !Number.isFinite(amt)) { setErr(`Isi nominal ${form.stage}.`); return; }
    const body = JSON.stringify({ stage: form.stage, amount: amt, pay_date: form.pay_date });
    const headers = { "Content-Type": "application/json" };
    if (form.id === null) {
      const newStatus = latestStage([...list.map((p) => p.stage), form.stage]);
      ask({
        kind: "create", title: `Tambah pembayaran ${form.stage}?`, summary: "Nominal ini otomatis ditambahkan ke Inventory Asset (Purchase).",
        changes: [
          { label: "Pembayaran baru", after: `${form.stage} · ${rp(amt)}${form.pay_date ? " · " + fmtDate(form.pay_date) : ""}` },
          { label: "Inventory Asset (Purchase)", before: rp(total), after: rp(round2(total + amt)) },
          { label: "Status pembayaran", before: status, after: newStatus },
        ],
        onConfirm: async () => after(await fetch(`/api/assets/${assetId}/payments`, { method: "POST", headers, body }), "Gagal menambah pembayaran"),
        onCancel: () => ask(null),
      });
    } else {
      const old = list.find((p) => p.id === form.id)!;
      const newTotal = round2(total - Number(old.amount) + amt);
      const newStatus = latestStage(list.map((p) => (p.id === old.id ? form.stage : p.stage)));
      const changes: Change[] = [];
      if (old.stage !== form.stage) changes.push({ label: "Tahap", before: old.stage, after: form.stage });
      if (Number(old.amount) !== amt) changes.push({ label: `Nominal ${form.stage}`, before: rp(Number(old.amount)), after: rp(amt) });
      if ((old.pay_date ?? "") !== form.pay_date) changes.push({ label: "Tanggal bayar", before: old.pay_date ? fmtDate(old.pay_date) : "", after: form.pay_date ? fmtDate(form.pay_date) : "" });
      if (!changes.length) { setErr("Belum ada data yang diubah."); return; }
      if (newTotal !== total) changes.push({ label: "Inventory Asset (Purchase)", before: rp(total), after: rp(newTotal) });
      if (newStatus !== status) changes.push({ label: "Status pembayaran", before: status, after: newStatus });
      ask({
        kind: "update", title: `Simpan perubahan pembayaran ${old.stage}?`, changes,
        onConfirm: async () => after(await fetch(`/api/assets/${assetId}/payments/${old.id}`, { method: "PUT", headers, body }), "Gagal menyimpan pembayaran"),
        onCancel: () => ask(null),
      });
    }
  }

  function remove(p: AssetPayment) {
    const rest = list.filter((x) => x.id !== p.id);
    ask({
      kind: "delete", title: `Hapus pembayaran ${p.stage}?`, summary: "Nominalnya akan dikurangkan dari Inventory Asset (Purchase).",
      changes: [
        { label: "Pembayaran dihapus", before: `${p.stage} · ${rp(Number(p.amount))}` },
        { label: "Inventory Asset (Purchase)", before: rp(total), after: rp(round2(total - Number(p.amount))) },
        { label: "Status pembayaran", before: status, after: latestStage(rest.map((x) => x.stage)) },
      ],
      onConfirm: async () => after(await fetch(`/api/assets/${assetId}/payments/${p.id}`, { method: "DELETE" }), "Gagal menghapus pembayaran"),
      onCancel: () => ask(null),
    });
  }

  const stageOptions = (current: string | null) => PAYMENT_STATUSES.filter((s) => s === current || !used.has(s));

  return (
    <section className="rounded-lg border border-slate-200 p-4 space-y-3" aria-label="Pembayaran">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pembayaran <span className={`${stageBadge(status)} ml-1`}>{status}</span></h3>
        <div className="text-sm">Inventory Asset (Purchase): <b className="tabular-nums amt">{rp(total)}</b></div>
      </div>

      {pays === null ? <p className="text-sm text-slate-500">Memuat…</p> : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span className={stageBadge(p.stage)}>{p.stage}</span>
              <span className="tabular-nums font-medium amt">{rp(Number(p.amount))}</span>
              <span className="text-xs text-slate-500">{p.pay_date ? fmtDate(p.pay_date) : ""}</span>
              <span className="ml-auto flex gap-3">
                <button type="button" className="link !text-xs" onClick={() => { setErr(""); setForm({ id: p.id, stage: p.stage, amount: String(p.amount), pay_date: p.pay_date ?? "" }); }}>Ubah</button>
                {list.length > 1 && <button type="button" className="text-xs text-red-600 hover:underline cursor-pointer" onClick={() => remove(p)}>Hapus</button>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-3" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(e as any); } }}>
          <div className="text-sm font-medium">{form.id === null ? "Tambah pembayaran" : `Ubah pembayaran ${list.find((p) => p.id === form.id)?.stage}`}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label><span className="label">Tahap</span>
              <select className="input mt-1" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {stageOptions(form.id === null ? null : list.find((p) => p.id === form.id)?.stage ?? null).map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label><span className="label">Nominal {form.stage}</span>
              <input type="number" step="any" className="input mt-1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus /></label>
            <label><span className="label">Tanggal bayar (opsional)</span>
              <input type="date" className="input mt-1" value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} /></label>
          </div>
          {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => { setForm(null); setErr(""); }}>Batal</button>
            <button type="button" className="btn-primary" onClick={submit as any}>Lanjut</button>
          </div>
        </div>
      ) : hasFinal ? (
        <p className="text-xs text-slate-500">Pembayaran sudah FINAL, tidak ada tahap berikutnya.</p>
      ) : (
        <div>
          <button type="button" className="btn !py-1 !px-2.5 text-xs" disabled={pays === null} onClick={() => { setErr(""); setForm({ id: null, stage: nextStage, amount: "", pay_date: "" }); }}>+ Tambah pembayaran ({nextStage})</button>
          <p className="text-xs text-slate-500 mt-2">Nominal tahap baru otomatis ditambahkan ke Inventory Asset (Purchase).</p>
        </div>
      )}
      {!form && err && <p className="text-sm text-red-600" role="alert">{err}</p>}
    </section>
  );
}

type Preview = { sheet: string; rows: number; claims: number; total: number; skipped: { row: number; reason: string }[] };

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmAsk, setConfirmAsk] = useState<ConfirmProps | null>(null);

  function askImport() {
    if (!preview) return;
    setConfirmAsk({
      kind: mode === "replace" ? "delete" : "create",
      title: mode === "replace" ? "Ganti semua data aset dengan isi file?" : "Tambahkan data dari file ke daftar aset?",
      summary: file?.name,
      changes: [
        { label: "Mode", after: mode === "replace" ? "Ganti semua data" : "Tambahkan ke data yang ada" },
        { label: "Sheet", after: preview.sheet },
        { label: "Baris aset diimpor", after: fmt(preview.rows) },
        { label: "Total Inventory Asset", after: `Rp ${fmt(preview.total)}` },
        { label: "Aset dengan data claim", after: fmt(preview.claims) },
      ],
      note: mode === "replace" ? "Semua aset (dan claim) yang ada sekarang akan dihapus lalu diganti. Tindakan ini tidak bisa dibatalkan." : "Baris dari file ditambahkan ke data yang ada dan bisa menimbulkan duplikat.",
      confirmLabel: mode === "replace" ? "Ya, ganti semua" : "Ya, impor",
      onConfirm: async () => { const e = await send(false); if (e) return e; },
      onCancel: () => setConfirmAsk(null),
    });
  }

  async function send(dry: boolean, f = file, m = mode): Promise<string | void> {
    if (!f) return;
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.set("file", f); fd.set("mode", m); if (dry) fd.set("dry", "1");
    const res = await fetch("/api/assets/import", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { const m2 = j.error ?? "Gagal"; if (dry) { setErr(m2); setPreview(null); } return m2; }
    if (dry) setPreview(j); else onDone();
  }

  return (
    <Modal title="Impor dari Excel" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Unggah file dengan format yang sama seperti <b>Inventory_asset_2026.xlsx</b> (sheet “Inventory asset per …”). Sistem akan menampilkan pratinjau sebelum menyimpan.</p>
        <input ref={ref} type="file" accept=".xlsx" className="input" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setPreview(null); if (f) send(true, f); }} />
        <fieldset className="space-y-2 text-sm">
          <label className="flex items-start gap-2"><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-1" />
            <span><b>Ganti semua data</b> — hapus daftar aset saat ini, lalu isi dari file (cocok untuk update bulanan).</span></label>
          <label className="flex items-start gap-2"><input type="radio" checked={mode === "append"} onChange={() => setMode("append")} className="mt-1" />
            <span><b>Tambahkan</b> — baris dari file ditambahkan ke data yang ada (bisa menimbulkan duplikat).</span></label>
        </fieldset>
        {preview && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
            <div>Sheet: <b>{preview.sheet}</b></div>
            <div>{fmt(preview.rows)} baris aset · total Rp {fmt(preview.total)}</div>
            <div>{fmt(preview.claims)} aset punya data claim (kolom W-AD / Remark / MVD) → masuk ke menu Claim Customer</div>
            {preview.skipped.length > 0 && <div className="text-slate-500">Baris catatan dilewati: {preview.skipped.map((s) => s.row).join(", ")}</div>}
          </div>
        )}
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={!preview || busy}
            onClick={askImport}>
            {busy ? "Memproses…" : "Impor"}</button>
        </div>
      </div>
      {confirmAsk && <ConfirmDialog {...confirmAsk} />}
    </Modal>
  );
}
