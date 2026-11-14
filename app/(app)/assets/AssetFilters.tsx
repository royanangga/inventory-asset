"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fmt, fmtIdr } from "../../../lib/format";
import type { GlAccount } from "../../../lib/types";

/** Filter Daftar Aset: otomatis diterapkan saat dipilih / diketik (tanpa tombol Terapkan) + ringkasan total otomatis. */
export default function AssetFilters({ accounts, projects, plants, total, amount }: {
  accounts: GlAccount[]; projects: string[]; plants: string[]; total: number; amount: number;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applied = useRef(sp.get("q") ?? "");
  // sinkronkan kolom cari bila URL berubah dari luar (mis. tombol Reset / Tutup); abaikan perubahan dari ketikan sendiri
  useEffect(() => {
    const urlQ = sp.get("q") ?? "";
    if (urlQ !== applied.current) { applied.current = urlQ; setQ(urlQ); }
  }, [sp]);

  function apply(key: string, value: string) {
    if (key === "q") applied.current = value;
    const u = new URLSearchParams(sp.toString());
    if (value) u.set(key, value); else u.delete(key);
    u.delete("page");
    start(() => router.replace(`${path}${u.toString() ? `?${u}` : ""}`));
  }
  function onSearch(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply("q", v.trim()), 400);
  }
  const hasFilter = ["q", "gl", "project", "plant", "check", "due"].some((k) => sp.get(k));

  return (
    <div className="card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto]">
        <label><span className="label">Cari</span>
          <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Vendor, PO, part number, nama barang…" className="input mt-1" /></label>
        <label><span className="label">Akun GL</span>
          <select value={sp.get("gl") ?? ""} onChange={(e) => apply("gl", e.target.value)} className="input mt-1">
            <option value="">Semua</option>
            {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            <option value="none">(tanpa akun)</option>
          </select></label>
        <label><span className="label">Project</span>
          <select value={sp.get("project") ?? ""} onChange={(e) => apply("project", e.target.value)} className="input mt-1">
            <option value="">Semua</option>
            {projects.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <label><span className="label">Div#Plant</span>
          <select value={sp.get("plant") ?? ""} onChange={(e) => apply("plant", e.target.value)} className="input mt-1">
            <option value="">Semua</option>
            {plants.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <label><span className="label">Jatuh tempo</span>
          <select value={sp.get("due") ?? ""} onChange={(e) => apply("due", e.target.value)} className="input mt-1">
            <option value="">Semua</option>
            <option value="due">Saatnya di-claim (jatuh tempo)</option>
            <option value="soon">Dalam 7 hari</option>
            <option value="nodue">Belum ada tanggal</option>
            <option value="claimed">Sudah diclaim</option>
          </select></label>
        <div className="flex items-end">
          <button type="button" className="btn" disabled={!hasFilter} onClick={() => { applied.current = ""; setQ(""); start(() => router.replace(path)); }}>Reset</button>
        </div>
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm ${pending ? "opacity-60" : ""}`} aria-live="polite">
        <span className="text-slate-600">{hasFilter ? "Hasil filter" : "Semua data"}: <b>{fmt(total)}</b> item</span>
        <span className="text-slate-600">Total Inventory Asset: <b className="text-slate-900 text-base">{fmtIdr(amount)}</b></span>
      </div>
    </div>
  );
}
