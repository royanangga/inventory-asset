"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "../lib/format";
import { getPrivacy, getTheme, togglePrivacy, toggleTheme } from "../lib/prefs";

type Cmd = { id: string; group: string; label: string; hint?: string; keywords?: string; right?: string; run: () => void };
type Hit = { id: number; item_name: string | null; product_code: string | null; vendor: string | null; project: string | null; po_no: string | null; amount: number };

const typing = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.isContentEditable);
};

/** Palet perintah (⌘K / Ctrl+K) + pintasan keyboard global: "/" cari, "g d|a|c|r" pindah halaman. */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [hits, setHits] = useState<{ rows: Hit[]; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => { setOpen(false); lastFocus.current?.focus?.(); }, []);
  const show = useCallback(() => { lastFocus.current = document.activeElement as HTMLElement | null; setQ(""); setIdx(0); setHits(null); setOpen(true); }, []);

  // pintasan global
  useEffect(() => {
    let seq = 0; // waktu "g" ditekan
    const go = (href: string) => router.push(href);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (open) close(); else show(); return; }
      if (open || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        const s = document.querySelector<HTMLInputElement>("[data-search]");
        if (s) { s.focus(); s.select(); } else show();
        return;
      }
      if (e.key === "?") { e.preventDefault(); show(); return; }
      if (e.key === "g") { seq = Date.now(); return; }
      if (seq && Date.now() - seq < 1000) {
        const map: Record<string, string> = { d: "/", a: "/assets", c: "/claims", r: "/reconciliation" };
        if (map[e.key]) { e.preventDefault(); go(map[e.key]); }
        seq = 0;
      }
    };
    const onOpen = () => show();
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-palette", onOpen); };
  }, [open, router, show, close]);

  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()); }, [open]);

  // pencarian aset langsung dari database
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) { setHits(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assets?q=${encodeURIComponent(term)}&limit=6`, { signal: ctl.signal });
        if (res.ok) { const j = await res.json(); setHits({ rows: j.rows, total: j.total }); }
      } catch { /* dibatalkan / gagal: abaikan */ }
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open]);

  const base = useMemo<Cmd[]>(() => {
    if (!open) return [];
    const nav = (href: string) => () => router.push(href);
    const dark = getTheme() === "dark", priv = getPrivacy();
    return [
      { id: "p-dash", group: "Halaman", label: "Dashboard", hint: "g lalu d", keywords: "ringkasan beranda home", run: nav("/") },
      { id: "p-assets", group: "Halaman", label: "Daftar Aset", hint: "g lalu a", keywords: "inventory asset daftar", run: nav("/assets") },
      { id: "p-claims", group: "Halaman", label: "Claim Customer", hint: "g lalu c", keywords: "klaim customer", run: nav("/claims") },
      { id: "p-recon", group: "Halaman", label: "Rekonsiliasi TB", hint: "g lalu r", keywords: "trial balance tb selisih", run: nav("/reconciliation") },
      { id: "v-due", group: "Tampilan cepat", label: "Aset yang saatnya di-claim", keywords: "jatuh tempo lewat overdue", run: nav("/assets?due=due") },
      { id: "v-soon", group: "Tampilan cepat", label: "Jatuh tempo dalam 7 hari", keywords: "segera minggu ini", run: nav("/assets?due=soon") },
      { id: "v-nodue", group: "Tampilan cepat", label: "Aset belum punya tanggal jatuh tempo", run: nav("/assets?due=nodue") },
      { id: "v-nogl", group: "Tampilan cepat", label: "Aset tanpa akun GL", keywords: "kosong gl", run: nav("/assets?check=nogl") },
      { id: "v-dup", group: "Tampilan cepat", label: "Kemungkinan duplikat", keywords: "ganda dobel", run: nav("/assets?check=dup") },
      { id: "v-neg", group: "Tampilan cepat", label: "Nilai nol atau negatif", keywords: "minus", run: nav("/assets?check=nonpos") },
      { id: "v-overdue", group: "Tampilan cepat", label: "Claim yang sudah lewat jatuh tempo", run: nav("/claims?status=overdue") },
      { id: "a-recon", group: "Tindakan", label: "Mulai rekonsiliasi baru", keywords: "buat tambah", run: nav("/reconciliation") },
      { id: "a-theme", group: "Tampilan", label: dark ? "Pakai tema terang" : "Pakai tema gelap", keywords: "dark light mode", run: toggleTheme },
      { id: "a-priv", group: "Tampilan", label: priv ? "Tampilkan nominal" : "Sembunyikan nominal", keywords: "privasi blur rahasia", run: togglePrivacy },
      { id: "a-out", group: "Akun", label: "Keluar", keywords: "logout", run: async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; } },
    ];
  }, [open, router]);

  const items = useMemo<Cmd[]>(() => {
    const term = q.trim().toLowerCase();
    const tokens = term.split(/\s+/).filter(Boolean);
    const cmds = tokens.length ? base.filter((c) => { const hay = `${c.label} ${c.keywords ?? ""} ${c.group}`.toLowerCase(); return tokens.every((t) => hay.includes(t)); }) : base;
    const out = [...cmds];
    if (term.length >= 2) {
      const find: Cmd = { id: "s-all", group: "Aset", label: `Cari “${q.trim()}” di Daftar Aset`, hint: hits ? `${fmt(hits.total)} hasil` : undefined, run: () => router.push(`/assets?q=${encodeURIComponent(q.trim())}`) };
      out.unshift(find);
      for (const r of hits?.rows ?? []) {
        out.push({
          id: `s-${r.id}`, group: "Aset", label: r.item_name || r.product_code || r.vendor || `Aset #${r.id}`,
          hint: [r.vendor, r.project, r.po_no].filter(Boolean).join(" · "), right: fmt(Number(r.amount)),
          run: () => router.push(`/assets?q=${encodeURIComponent(r.po_no || r.product_code || r.item_name || q.trim())}`),
        });
      }
    }
    return out;
  }, [q, base, hits, router]);

  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-i="${idx}"]`)?.scrollIntoView({ block: "nearest" }); }, [idx]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const c = items[idx]; if (c) { setOpen(false); c.run(); } }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  if (!open) return null;
  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-start justify-items-center px-4 pt-[12vh]" style={{ background: "rgba(8, 12, 24, 0.55)", backdropFilter: "blur(3px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Pencarian cepat" className="pop card w-full max-w-xl overflow-hidden" style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.55)" }}>
        <div className="flex items-center gap-3 px-4 border-b" style={{ borderColor: "var(--line)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--s400)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[idx] ? `pal-${items[idx].id}` : undefined} aria-label="Ketik perintah atau kata kunci aset"
            placeholder="Cari vendor, PO, part number — atau ketik perintah…" className="flex-1 bg-transparent py-4 text-[15px] placeholder:text-slate-400" style={{ outline: "none" }} />
          <kbd className="kbd">esc</kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto py-1.5">
          {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Tidak ada yang cocok dengan “{q}”. Coba nama vendor, nomor PO, atau nama halaman.</p>}
          {items.map((c, i) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {head && <div className="px-4 pt-2.5 pb-1 text-xs font-medium text-slate-500">{head}</div>}
                <div id={`pal-${c.id}`} data-i={i} role="option" aria-selected={i === idx} onMouseMove={() => setIdx(i)} onClick={() => { setOpen(false); c.run(); }}
                  className="mx-1.5 flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer text-sm" style={{ background: i === idx ? "var(--b50)" : "transparent" }}>
                  <span className="truncate font-medium" style={{ color: i === idx ? "var(--b700)" : undefined }}>{c.label}</span>
                  {c.hint && <span className="truncate text-xs text-slate-500">{c.hint}</span>}
                  {c.right && <span className="ml-auto tabular-nums text-xs text-slate-600 amt">{c.right}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 px-4 py-2.5 text-xs text-slate-500 border-t" style={{ borderColor: "var(--line)", background: "var(--s50)" }}>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> pilih</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> buka</span>
          <span className="ml-auto hidden sm:block">Di luar kotak ini: <kbd className="kbd">/</kbd> cari · <kbd className="kbd">g</kbd> lalu <kbd className="kbd">d</kbd> <kbd className="kbd">a</kbd> <kbd className="kbd">c</kbd> <kbd className="kbd">r</kbd></span>
        </div>
      </div>
    </div>
  );
}
