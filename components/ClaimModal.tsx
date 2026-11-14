"use client";
import { useState } from "react";
import Modal from "./Modal";
import { fmt } from "../lib/format";
import type { Claim } from "../lib/types";

export type ClaimTarget = {
  assetId: number;
  title: string; // ringkasan aset (vendor · nama barang)
  amount: number;
  claimTo: string | null;
  claim: Claim | null;
};

type Form = Record<string, string>;
const FIELDS = ["due_date", "trans_ref", "expense_coa", "sales_tooling", "expense_amount", "fa_amount", "fa_date", "remark", "mvd_status", "mvd_note", "note"] as const;

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
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const T = (k: string, label: string, type = "text", cls = "") => (
    <label className={cls}><span className="label">{label}</span>
      <input type={type} value={f[k]} onChange={set(k)} className="input mt-1" step={type === "number" ? "any" : undefined} /></label>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch(target.claim ? `/api/claims/${target.claim.id}` : "/api/claims", {
      method: target.claim ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, asset_id: target.assetId }),
    });
    if (res.ok) return onSaved();
    setErr((await res.json().catch(() => ({}))).error ?? "Gagal menyimpan"); setBusy(false);
  }
  async function cancelClaim() {
    if (!target.claim || !confirm("Batalkan claim ini? Aset tetap ada di inventory, data claim dihapus.")) return;
    setBusy(true);
    const res = await fetch(`/api/claims/${target.claim.id}`, { method: "DELETE" });
    if (res.ok) return onSaved();
    setErr("Gagal membatalkan claim"); setBusy(false);
  }

  return (
    <Modal title={target.claim ? "Ubah claim customer" : "Claim ke customer"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
          <div className="font-medium">{target.title}</div>
          <div className="text-slate-500">Inventory Asset Rp {fmt(target.amount)}{target.claimTo ? ` · ${target.claimTo}` : ""}</div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {T("due_date", target.claim ? "Tanggal jatuh tempo" : "Tanggal jatuh tempo *", "date")}
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
          <div>{target.claim && <button type="button" className="btn-danger" onClick={cancelClaim} disabled={busy}>Batalkan claim</button>}</div>
          <div className="flex gap-2"><button type="button" className="btn" onClick={onClose}>Batal</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button></div>
        </div>
      </form>
    </Modal>
  );
}
