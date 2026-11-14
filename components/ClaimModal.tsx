"use client";
import { useState } from "react";
import Modal from "./Modal";
import ConfirmDialog, { type ConfirmProps } from "./ConfirmDialog";
import { diffForm, listForm, type FieldDef } from "../lib/diff";
import { fmt, fmtDate } from "../lib/format";
import type { Claim } from "../lib/types";

export type ClaimTarget = {
  assetId: number;
  title: string; // ringkasan aset (vendor · nama barang)
  amount: number;
  claimTo: string | null;
  dueDate?: string | null;
  claim: Claim | null;
};

type Form = Record<string, string>;
const FIELDS = ["trans_ref", "expense_coa", "sales_tooling", "expense_amount", "fa_amount", "fa_date", "remark", "mvd_status", "mvd_note", "note"] as const;

const DEFS: FieldDef[] = [
  { key: "claimed", label: "Status claim", kind: "bool", show: (v) => (v === "true" ? "Sudah di-claim" : "Baru catatan (belum di-claim)") },
  { key: "trans_ref", label: "Trans (JV)" }, { key: "expense_coa", label: "COA Expense" },
  { key: "sales_tooling", label: "Sales Tooling Amount", kind: "num" }, { key: "expense_amount", label: "Expense Amount", kind: "num" },
  { key: "fa_amount", label: "FA Amount", kind: "num" }, { key: "fa_date", label: "Tanggal FA", kind: "date" },
  { key: "mvd_status", label: "MVD" }, { key: "mvd_note", label: "MVD (keterangan / target)" },
  { key: "remark", label: "Remark" }, { key: "note", label: "Catatan lain" },
];

function toForm(c: Claim | null): Form {
  const f: Form = {};
  for (const k of FIELDS) {
    const v = c ? (c as any)[k] : null;
    f[k] = v === null || v === undefined ? (k.endsWith("amount") || k === "sales_tooling" ? "0" : "") : String(v);
  }
  return f;
}

/** Form claim ke customer (kolom W-AD + Remark/MVD + jatuh tempo). Satu aset = satu claim. */
export default function ClaimModal({ target, onClose, onSaved }: { target: ClaimTarget; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(toForm(target.claim));
  const [claimed, setClaimed] = useState(target.claim ? target.claim.claimed : true);
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState<ConfirmProps | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const T = (k: string, label: string, type = "text", cls = "") => (
    <label className={cls}><span className="label">{label}</span>
      <input type={type} value={f[k]} onChange={set(k)} className="input mt-1" step={type === "number" ? "any" : undefined} /></label>
  );

  const original = { ...toForm(target.claim), claimed: String(target.claim ? target.claim.claimed : true) };

  /** Form disubmit → konfirmasi dengan rincian perubahan, baru simpan. */
  function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const now = { ...f, claimed: String(claimed) };
    const run = async (): Promise<string | void> => {
      const res = await fetch(target.claim ? `/api/claims/${target.claim.id}` : "/api/claims", {
        method: target.claim ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, claimed, asset_id: target.assetId }),
      });
      if (res.ok) return onSaved();
      return (await res.json().catch(() => ({}))).error ?? "Gagal menyimpan";
    };
    if (target.claim) {
      const changes = diffForm(DEFS, original, now);
      if (changes.length === 0) { setErr("Belum ada data yang diubah."); return; }
      setAsk({ kind: "update", title: "Simpan perubahan claim?", summary: `${changes.length} data akan diubah pada claim ${target.title}.`, changes, onConfirm: run, onCancel: () => setAsk(null) });
    } else {
      setAsk({ kind: "create", title: "Buat claim ke customer?", summary: `Claim baru untuk ${target.title}.`, changes: listForm(DEFS, now, "after"), onConfirm: run, onCancel: () => setAsk(null) });
    }
  }
  function cancelClaim() {
    if (!target.claim) return;
    setAsk({
      kind: "delete", title: "Batalkan claim ini?", summary: `${target.title} · Inventory Asset Rp ${fmt(target.amount)}`,
      changes: listForm(DEFS, original, "before"), note: "Aset tetap ada di inventory, hanya data claim yang dihapus. Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, batalkan claim",
      onConfirm: async () => {
        const res = await fetch(`/api/claims/${target.claim!.id}`, { method: "DELETE" });
        if (res.ok) return onSaved();
        return "Gagal membatalkan claim";
      },
      onCancel: () => setAsk(null),
    });
  }

  return (
    <Modal title={target.claim ? "Ubah claim customer" : "Claim ke customer"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
          <div className="font-medium">{target.title}</div>
          <div className="text-slate-500">Inventory Asset Rp {fmt(target.amount)}{target.claimTo ? ` · ${target.claimTo}` : ""} · Jatuh tempo {target.dueDate ? fmtDate(target.dueDate) : "belum diisi"}</div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="sm:col-span-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={claimed} onChange={(e) => setClaimed(e.target.checked)} /> <span><b>Sudah di-claim ke customer</b> <span className="text-slate-500">(hilangkan centang bila baru catatan)</span></span></label>
          {T("trans_ref", "Trans (JV)")}
          {T("expense_coa", "COA Expense")}
          {T("sales_tooling", "Sales Tooling Amount", "number")}
          {T("expense_amount", "Expense Amount", "number")}
          {T("fa_amount", "FA Amount", "number")}
          {T("fa_date", "Tanggal FA", "date")}
          {T("mvd_status", "MVD", "text", "sm:col-span-2")}
          {T("mvd_note", "MVD (keterangan / target)")}
          {T("remark", "Remark", "text", "sm:col-span-3")}
          {T("note", "Catatan lain", "text", "sm:col-span-3")}
        </div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="flex justify-between pt-1">
          <div>{target.claim && <button type="button" className="btn-danger" onClick={cancelClaim}>Batalkan claim</button>}</div>
          <div className="flex gap-2"><button type="button" className="btn" onClick={onClose}>Batal</button>
            <button className="btn-primary">Simpan</button></div>
        </div>
      </form>
      {ask && <ConfirmDialog {...ask} />}
    </Modal>
  );
}
