"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog, { type ConfirmProps } from "../../../components/ConfirmDialog";
import { fmtDate } from "../../../lib/format";

export default function NewRecon({ defaultTitle, defaultDate }: { defaultTitle: string; defaultDate: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [asOf, setAsOf] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [ask, setAsk] = useState<ConfirmProps | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    setAsk({
      kind: "create", title: "Buat rekonsiliasi baru?", summary: "Rekonsiliasi baru dibuat sebagai draft dengan data berikut.",
      changes: [{ label: "Judul", after: title }, { label: "Posisi per tanggal", after: fmtDate(asOf) }, { label: "Status", after: "Draft" }],
      onConfirm: async () => {
        const res = await fetch("/api/reconciliations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, as_of: asOf }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) return j.error ?? "Gagal";
        setBusy(true); setAsk(null); router.push(`/reconciliation/${j.id}`);
      },
      onCancel: () => setAsk(null),
    });
  }

  return (
    <form onSubmit={create} className="card p-5 grid gap-3 sm:grid-cols-[2fr_1fr_auto] items-end">
      <label><span className="label">Judul</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1" /></label>
      <label><span className="label">Posisi per tanggal</span><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="input mt-1" /></label>
      <button className="btn-primary justify-center" disabled={busy || !title || !asOf}>{busy ? "Membuat…" : "+ Rekonsiliasi baru"}</button>
      {err && <p className="text-sm text-red-600 sm:col-span-3" role="alert">{err}</p>}
      {ask && <ConfirmDialog {...ask} />}
    </form>
  );
}
