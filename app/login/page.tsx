"use client";
import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) { window.location.href = "/"; return; }
    setErr((await res.json().catch(() => ({}))).error ?? "Gagal masuk");
    setBusy(false);
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8 space-y-5">
        <div>
          <div className="text-xs font-semibold tracking-widest text-brand-600 uppercase">Inventory Asset</div>
          <h1 className="text-2xl font-semibold mt-1">Masuk</h1>
          <p className="text-sm text-slate-500 mt-1">Masukkan password untuk membuka daftar aset dan rekonsiliasi.</p>
        </div>
        <label className="block">
          <span className="label">Password</span>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className="input mt-1" />
        </label>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <button disabled={busy || !pw} className="btn-primary w-full justify-center">{busy ? "Memeriksa…" : "Masuk"}</button>
      </form>
    </main>
  );
}
