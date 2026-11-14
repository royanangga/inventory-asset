"use client";
import { useEffect, useState } from "react";
import { getPrivacy, getTheme, togglePrivacy, toggleTheme } from "../lib/prefs";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Bilah atas: pencarian cepat (⌘K), mode privasi, tema. */
export default function Topbar() {
  const [dark, setDark] = useState(false);
  const [priv, setPriv] = useState(false);
  const [mac, setMac] = useState(false);
  useEffect(() => {
    const sync = () => { setDark(getTheme() === "dark"); setPriv(getPrivacy()); };
    sync();
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    window.addEventListener("prefs-change", sync);
    return () => window.removeEventListener("prefs-change", sync);
  }, []);
  const iconBtn = "grid place-items-center h-9 w-9 rounded-lg border text-slate-600 hover:text-slate-900 transition cursor-pointer";
  return (
    <div className="sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2.5 mb-5 flex items-center gap-2 backdrop-blur-md"
      style={{ background: "color-mix(in oklab, var(--bg) 82%, transparent)", borderBottom: "1px solid var(--line)" }}>
      <button onClick={() => window.dispatchEvent(new Event("open-palette"))}
        className="flex-1 max-w-md flex items-center gap-2.5 h-9 px-3 rounded-lg border text-sm text-slate-500 hover:text-slate-700 transition cursor-pointer text-left"
        style={{ background: "var(--surface)", borderColor: "var(--line-strong)" }} aria-label="Buka pencarian cepat">
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span className="truncate">Cari aset, buka halaman, jalankan perintah…</span>
        <span className="ml-auto hidden sm:flex gap-1"><kbd className="kbd">{mac ? "⌘" : "Ctrl"}</kbd><kbd className="kbd">K</kbd></span>
      </button>
      <div className="ml-auto flex gap-2">
        <button className={iconBtn} style={{ background: "var(--surface)", borderColor: priv ? "var(--b500)" : "var(--line-strong)", color: priv ? "var(--b600)" : undefined }}
          onClick={togglePrivacy} aria-pressed={priv} title={priv ? "Nominal disembunyikan (arahkan kursor untuk mengintip)" : "Sembunyikan nominal"} aria-label="Mode privasi">
          {priv
            ? <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c5 0 8.5 4 9.5 6a14 14 0 01-2.6 3.3M6.4 7.5C4.2 9 2.8 11 2.5 12c1 2 4.5 6 9.5 6 1.3 0 2.5-.3 3.6-.7M9.9 10a3 3 0 004.1 4.1" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z" /><circle cx="12" cy="12" r="3" /></svg>}
        </button>
        <button className={iconBtn} style={{ background: "var(--surface)", borderColor: "var(--line-strong)" }} onClick={toggleTheme} title={dark ? "Ganti ke tema terang" : "Ganti ke tema gelap"} aria-label="Ganti tema">
          {dark
            ? <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" /></svg>}
        </button>
      </div>
    </div>
  );
}
