"use client";
import { useEffect, useState } from "react";
import Seal from "../../components/Seal";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [stampDate, setStampDate] = useState("");
  useEffect(() => {
    const p = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
    setStampDate(p.replace(/\//g, "."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) { window.location.href = "/"; return; }
    setErr((await res.json().catch(() => ({}))).error ?? "Gagal masuk");
    setBusy(false);
  }

  return (
    <main className="ledger min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center -mb-9 relative z-10 h-[88px] items-end">
          {stampDate && <div style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))", color: "#c3cbfa", ["--stamp" as string]: "#c3cbfa" }}><Seal kind="date" size={88} animate mid={stampDate} bottom="MASUK" title="Cap masuk" /></div>}
        </div>
        <form onSubmit={submit} className="card pt-14 px-8 pb-8 space-y-5">
          <div className="text-center">
            <h1 className="title">Inventory Asset</h1>
            <p className="text-sm text-slate-500 mt-1">Masukkan password untuk membuka daftar aset dan rekonsiliasi.</p>
          </div>
          <label className="block">
            <span className="label">Password</span>
            <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input mt-1" />
          </label>
          {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
          <button disabled={busy || !pw} className="btn-primary w-full justify-center">{busy ? "Memeriksa…" : "Masuk"}</button>
        </form>
      </div>
    </main>
  );
}
