"use client";
import { useEffect, useState } from "react";
import ConfirmDialog, { type ConfirmProps } from "../../components/ConfirmDialog";

type St = { ready: boolean; assets: number } | { error: string };

export default function SetupPage() {
  const [st, setSt] = useState<St | null>(null);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ask, setAsk] = useState<ConfirmProps | null>(null);

  async function load() { setSt(await (await fetch("/api/setup")).json()); }
  useEffect(() => { load(); }, []);

  function create() {
    setAsk({
      kind: "create", title: "Buat tabel database?", summary: "Tabel yang belum ada akan dibuat; data yang sudah ada tidak diubah.",
      changes: [{ label: "Tindakan", after: "Jalankan migrasi skema database" }],
      confirmLabel: "Ya, buat tabel",
      onConfirm: async () => {
        setMsg("");
        const res = await fetch("/api/setup", { method: "POST" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) return j.error ?? "Gagal membuat tabel";
        setSt(j); setMsg("Tabel database siap."); setAsk(null);
      },
      onCancel: () => setAsk(null),
    });
  }
  function upload() {
    if (!file) return;
    setAsk({
      kind: "delete", title: "Ganti semua data aset dengan isi file?", summary: file.name,
      changes: [{ label: "File", after: file.name }, { label: "Mode", after: "Ganti semua data" }, { label: "Aset saat ini", before: `${assets} aset akan dihapus` }],
      note: "Semua aset yang ada sekarang akan dihapus lalu diganti. Tindakan ini tidak bisa dibatalkan.", confirmLabel: "Ya, impor & ganti",
      onConfirm: async () => {
        setMsg("");
        const fd = new FormData(); fd.set("file", file); fd.set("mode", "replace");
        const res = await fetch("/api/assets/import", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) return j.error ?? "Gagal impor";
        setMsg(`${j.inserted} aset berhasil diimpor.`); setAsk(null); load();
      },
      onCancel: () => setAsk(null),
    });
  }

  const err = st && "error" in st ? st.error : "";
  const ready = st && "ready" in st && st.ready;
  const assets = st && "assets" in st ? st.assets : 0;

  return (
    <main className="ledger min-h-screen grid place-items-center px-4 py-10">
      <div className="card w-full max-w-xl p-8 space-y-6">
        <div>
          <h1 className="title">Setup awal</h1>
          <p className="text-sm text-slate-500 mt-1">Dilakukan sekali dari browser: buat tabel database, lalu impor file Excel Anda.</p>
        </div>
        {err && <p className="rounded-lg bg-red-50 text-red-700 text-sm p-3" role="alert">{err}<br />Periksa variabel <b>DATABASE_URL</b> di pengaturan Vercel, lalu redeploy.</p>}

        <section className="space-y-2">
          <h2 className="font-semibold">Langkah 1: Buat tabel database {ready && <span className="badge bg-emerald-50 text-emerald-700 ml-2">Selesai</span>}</h2>
          <button className="btn-primary" onClick={create} disabled={!!err}>{ready ? "Jalankan ulang (aman)" : "Buat tabel"}</button>
        </section>

        <section className={`space-y-2 ${ready ? "" : "opacity-50 pointer-events-none"}`}>
          <h2 className="font-semibold">Langkah 2: Impor data aset {assets > 0 && <span className="badge bg-emerald-50 text-emerald-700 ml-2">{assets} aset</span>}</h2>
          <p className="text-sm text-slate-500">Pilih file <b>Inventory_asset_2026.xlsx</b> (sheet “Inventory asset per okt26”). Data yang ada akan diganti.</p>
          <input type="file" accept=".xlsx" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button className="btn-primary" onClick={upload} disabled={!file}>Impor Excel</button>
        </section>

        {msg && <p className="text-sm text-emerald-700" role="status">{msg}</p>}
        {ready && assets > 0 && <a href="/" className="btn justify-center w-full">Buka website</a>}
      </div>
      {ask && <ConfirmDialog {...ask} />}
    </main>
  );
}
