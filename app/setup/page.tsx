"use client";
import { useEffect, useState } from "react";

type St = { ready: boolean; assets: number } | { error: string };

export default function SetupPage() {
  const [st, setSt] = useState<St | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function load() { setSt(await (await fetch("/api/setup")).json()); }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/setup", { method: "POST" });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) setMsg(j.error); else { setSt(j); setMsg("Tabel database siap."); }
  }
  async function upload() {
    if (!file) return;
    setBusy(true); setMsg("");
    const fd = new FormData(); fd.set("file", file); fd.set("mode", "replace");
    const res = await fetch("/api/assets/import", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(j.error ?? "Gagal impor"); return; }
    setMsg(`${j.inserted} aset berhasil diimpor.`); load();
  }

  const err = st && "error" in st ? st.error : "";
  const ready = st && "ready" in st && st.ready;
  const assets = st && "assets" in st ? st.assets : 0;

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="card w-full max-w-xl p-8 space-y-6">
        <div>
          <div className="text-xs font-semibold tracking-widest text-brand-600 uppercase">Inventory Asset</div>
          <h1 className="text-2xl font-semibold mt-1">Setup awal</h1>
          <p className="text-sm text-slate-500 mt-1">Dilakukan sekali dari browser: buat tabel database, lalu impor file Excel Anda.</p>
        </div>
        {err && <p className="rounded-lg bg-red-50 text-red-700 text-sm p-3" role="alert">{err}<br />Periksa variabel <b>DATABASE_URL</b> di pengaturan Vercel, lalu redeploy.</p>}

        <section className="space-y-2">
          <h2 className="font-semibold">1. Buat tabel database {ready && <span className="badge bg-emerald-50 text-emerald-700 ml-2">Selesai</span>}</h2>
          <button className="btn-primary" onClick={create} disabled={busy || !!err}>{ready ? "Jalankan ulang (aman)" : "Buat tabel"}</button>
        </section>

        <section className={`space-y-2 ${ready ? "" : "opacity-50 pointer-events-none"}`}>
          <h2 className="font-semibold">2. Impor data aset {assets > 0 && <span className="badge bg-emerald-50 text-emerald-700 ml-2">{assets} aset</span>}</h2>
          <p className="text-sm text-slate-500">Pilih file <b>Inventory_asset_2026.xlsx</b> (sheet “Inventory asset per okt26”). Data yang ada akan diganti.</p>
          <input type="file" accept=".xlsx" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button className="btn-primary" onClick={upload} disabled={!file || busy}>{busy ? "Memproses…" : "Impor Excel"}</button>
        </section>

        {msg && <p className="text-sm text-emerald-700" role="status">{msg}</p>}
        {ready && assets > 0 && <a href="/" className="btn justify-center w-full">Buka website →</a>}
      </div>
    </main>
  );
}
