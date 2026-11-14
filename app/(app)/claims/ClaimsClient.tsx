"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ClaimModal, { type ClaimTarget } from "../../../components/ClaimModal";
import { fmt, fmtDate, todayJakarta } from "../../../lib/format";
import type { ClaimRow } from "../../../lib/types";

export default function ClaimsClient({ rows, exportQs }: { rows: ClaimRow[]; exportQs: string }) {
  const router = useRouter();
  const [target, setTarget] = useState<ClaimTarget | null>(null);
  const today = todayJakarta();

  const open = (r: ClaimRow) =>
    setTarget({ assetId: r.asset_id, title: [r.vendor, r.item_name].filter(Boolean).join(" · "), amount: r.amount, claimTo: r.claim_to, dueDate: r.due_date, claim: r });

  return (
    <>
      <div className="flex items-center gap-2">
        <a className="btn" href={`/api/claims/export?${exportQs}`}>Ekspor Excel</a>
        <span className="text-sm text-slate-500">Klik baris untuk melihat atau mengubah claim. Claim baru dibuat dari menu <b>Daftar Aset</b> (tombol “Claim” di baris aset).</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1100px] text-[13px]">
          <thead>
            <tr>
              <th className="th">Jatuh tempo</th><th className="th">Claim ke</th><th className="th">Aset</th>
              <th className="th text-right">Inventory Asset</th><th className="th">Trans / COA</th>
              <th className="th text-right">Sales Tooling</th><th className="th text-right">Expense</th><th className="th text-right">FA Amount</th>
              <th className="th">Remark / MVD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={9} className="td text-center text-slate-500 py-10">Belum ada claim yang cocok.</td></tr>}
            {rows.map((r) => {
              const overdue = r.due_date && r.due_date < today;
              return (
                <tr key={r.id} tabIndex={0} role="button" aria-label={`Buka claim ${r.item_name ?? ""}`} className="hover:bg-slate-50/70 align-top cursor-pointer"
                  onClick={() => open(r)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(r); } }}>
                  <td className="td whitespace-nowrap">
                    {r.due_date ? <span className={`badge ${overdue ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{fmtDate(r.due_date)}</span> : <span className="badge bg-amber-50 text-amber-800">belum ada</span>}
                  </td>
                  <td className="td whitespace-nowrap">{r.claim_to ?? "-"}</td>
                  <td className="td min-w-[240px]"><div>{r.item_name}</div><div className="text-xs text-slate-500">{r.vendor} · {r.project} · {r.po_no}</div></td>
                  <td className="td num amt">{fmt(r.amount)}</td>
                  <td className="td whitespace-nowrap text-slate-600"><div>{r.trans_ref}</div><div className="text-xs text-slate-400">{r.expense_coa}</div></td>
                  <td className="td num amt">{r.sales_tooling ? fmt(r.sales_tooling) : "-"}</td>
                  <td className="td num amt">{r.expense_amount ? fmt(r.expense_amount) : "-"}</td>
                  <td className="td num amt">{r.fa_amount ? fmt(r.fa_amount) : "-"}{r.fa_date && <div className="text-xs text-slate-400">{fmtDate(r.fa_date)}</div>}</td>
                  <td className="td min-w-[220px] text-slate-600"><div>{r.remark}</div><div className="text-xs text-slate-400">{[r.mvd_status, r.mvd_note].filter(Boolean).join(" · ")}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {target && <ClaimModal target={target} onClose={() => setTarget(null)} onSaved={() => { setTarget(null); router.refresh(); }} />}
    </>
  );
}
