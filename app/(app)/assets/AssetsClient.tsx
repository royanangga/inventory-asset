"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../../../components/Modal";
import { fmt, fmtDate } from "../../../lib/format";
import ClaimModal, { type ClaimTarget } from "../../../components/ClaimModal";
import type { AssetRow, Claim, GlAccount } from "../../../lib/types";

type Form = Record<string, string>;
const EMPTY: Form = {
  gl_account: "", vendor: "", project: "", po_no: "", ringgisho_no: "", div_plant: "", tgl: "", trans_no: "", product_code: "", part_number: "",
  item_name: "", qty: "1", ringgisho_lc: "0", kesaisho_sales: "0", amount: "0", claim_to: "",
};

function toForm(a: AssetRow): Form {
  const f: Form = {};
  for (const k of Object.keys(EMPTY)) f[k] = (a as any)[k] === null || (a as any)[k] === undefined ? "" : String((a as any)[k]);
  return f;
}

export default function AssetsClient({ rows, accounts, exportQs }: { rows: AssetRow[]; accounts: GlAccount[]; exportQs: string }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [edit, setEdit] = useState<{ id: number | null; form: Form } | null>(null);
  const [claim, setClaim] = useState<ClaimTarget | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [bulkGl, setBulkGl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const accName = useMemo(() => Object.fromEntries(accounts.map((a) => [a.code, a.name])), [accounts]);

  const allSelected = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function openClaim(r: AssetRow) {
    let existing: Claim | null = null;
    if (r.claim_id) {
      const res = await fetch(`/api/claims/${r.claim_id}`);
      if (res.ok) existing = await res.json();
    }
    setClaim({ assetId: r.id, title: [r.vendor, r.item_name].filter(Boolean).join(" · "), amount: r.amount, claimTo: r.claim_to, claim: existing });
  }

  async function bulk(body: object, okMsg: (n: number) => string) {
    setBusy(true); setMsg("");
    const res = await fetch("/api/assets/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...sel], ...body }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(j.error ?? "Gagal"); return; }
    setMsg(okMsg(j.affected)); setSel(new Set()); setBulkGl(""); router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => setEdit({ id: null, form: { ...EMPTY } })}>+ Tambah aset</button>
        <button className="btn" onClick={() => setShowImport(true)}>Impor Excel</button>
        <a className="btn" href={`/api/assets/export?${exportQs}`}>Ekspor Excel</a>
        {msg && <span className="text-sm text-emerald-700 ml-2" role="status">{msg}</span>}
      </div>

      {sel.size > 0 && (
        <div className="card flex flex-wrap items-center gap-3 px-4 py-3 border-brand-100 bg-brand-50/60">
          <span className="text-sm font-medium">{sel.size} dipilih</span>
          <select value={bulkGl} onChange={(e) => setBulkGl(e.target.value)} className="input !w-auto" aria-label="Akun GL tujuan">
            <option value="">Pindahkan ke akun GL…</option>
            {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
          <button className="btn-primary" disabled={!bulkGl || busy}
            onClick={() => confirm(`Pindahkan ${sel.size} aset ke akun ${bulkGl}?`) && bulk({ gl_account: bulkGl }, (n) => `${n} aset dipindahkan ke ${bulkGl}`)}>Terapkan</button>
          <button className="btn-danger" disabled={busy}
            onClick={() => confirm(`Hapus ${sel.size} aset? Tindakan ini tidak bisa dibatalkan.`) && bulk({ action: "delete" }, (n) => `${n} aset dihapus`)}>Hapus</button>
          <button className="btn" onClick={() => setSel(new Set())}>Batal pilih</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-[13px]">
          <thead>
            <tr>
              <th className="th w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua" /></th>
              <th className="th">GL</th><th className="th">Vendor / Project</th><th className="th">PO / Tgl</th>
              <th className="th">Kode / Part</th><th className="th">Nama Barang</th>
              <th className="th text-right">Qty</th><th className="th text-right">Inventory Asset</th><th className="th">Claim</th><th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={10} className="td text-center text-slate-500 py-10">Tidak ada data yang cocok.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className={sel.has(r.id) ? "bg-brand-50/50" : "hover:bg-slate-50/70"}>
                <td className="td"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Pilih aset ${r.id}`} /></td>
                <td className="td whitespace-nowrap" title={r.gl_account ? accName[r.gl_account] : ""}>
                  {r.gl_account ?? <span className="badge bg-red-50 text-red-700">kosong</span>}</td>
                <td className="td min-w-[170px]"><div>{r.vendor}</div><div className="text-xs text-slate-500">{r.project}</div></td>
                <td className="td whitespace-nowrap text-slate-600"><div>{r.po_no}</div><div className="text-xs text-slate-400">{fmtDate(r.tgl)}</div></td>
                <td className="td text-slate-600 whitespace-nowrap"><div>{r.product_code}</div><div className="text-xs text-slate-400">{r.part_number}</div></td>
                <td className="td min-w-[200px]">{r.item_name}{r.claim_to && <div className="mt-1"><span className="badge bg-slate-100 text-slate-700">{r.claim_to}</span></div>}</td>
                <td className="td num">{fmt(r.qty)}</td>
                <td className={`td num font-medium ${r.amount < 0 ? "text-red-600" : ""}`}>{fmt(r.amount)}</td>
                <td className="td whitespace-nowrap">
                  {r.claimed
                    ? <button className="badge bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100" onClick={() => openClaim(r)} title="Lihat / ubah claim">Diclaim{r.claim_due_date ? ` · jt ${fmtDate(r.claim_due_date)}` : ""}</button>
                    : r.claim_id
                      ? <button className="badge bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => openClaim(r)} title="Ada catatan Remark/MVD, belum diclaim">Catatan</button>
                      : <button className="text-brand-600 text-sm hover:underline cursor-pointer" onClick={() => openClaim(r)}>Claim</button>}
                </td>
                <td className="td"><button className="text-brand-600 text-sm hover:underline cursor-pointer" onClick={() => setEdit({ id: r.id, form: toForm(r) })}>Ubah</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && <AssetModal edit={edit} accounts={accounts} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
      {claim && <ClaimModal target={claim} onClose={() => setClaim(null)} onSaved={() => { setClaim(null); router.refresh(); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); router.refresh(); }} />}
    </>
  );
}

function AssetModal({ edit, accounts, onClose, onSaved }: { edit: { id: number | null; form: Form }; accounts: GlAccount[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(edit.form);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch(edit.id ? `/api/assets/${edit.id}` : "/api/assets", { method: edit.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) return onSaved();
    setErr((await res.json().catch(() => ({}))).error ?? "Gagal menyimpan"); setBusy(false);
  }
  async function del() {
    if (!edit.id || !confirm("Hapus aset ini?")) return;
    setBusy(true);
    const res = await fetch(`/api/assets/${edit.id}`, { method: "DELETE" });
    if (res.ok) return onSaved();
    setErr("Gagal menghapus"); setBusy(false);
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
          {T("amount", "Inventory Asset (Purchase)", "number", "sm:col-span-3")}
          {T("claim_to", "Customer MVD (Claim ADM / TBINA)", "text", "sm:col-span-3")}
        </div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex justify-between pt-1">
          <div>{edit.id && <button type="button" className="btn-danger" onClick={del} disabled={busy}>Hapus</button>}</div>
          <div className="flex gap-2"><button type="button" className="btn" onClick={onClose}>Batal</button><button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button></div>
        </div>
      </form>
    </Modal>
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

  async function send(dry: boolean, f = file, m = mode) {
    if (!f) return;
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.set("file", f); fd.set("mode", m); if (dry) fd.set("dry", "1");
    const res = await fetch("/api/assets/import", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "Gagal"); setPreview(null); return; }
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
            onClick={() => (mode === "append" || confirm("Semua aset yang ada sekarang akan diganti. Lanjutkan?")) && send(false)}>
            {busy ? "Memproses…" : "Impor"}</button>
        </div>
      </div>
    </Modal>
  );
}
