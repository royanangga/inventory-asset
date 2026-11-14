"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Satu baris detail perubahan. before saja = data dihapus, after saja = data baru, keduanya = diubah. */
export type Change = { label: string; before?: string; after?: string };
export type ConfirmItem = { primary: string; secondary?: string; detail?: string };

export type ConfirmProps = {
  kind: "create" | "update" | "delete" | "action";
  title: string;
  /** Kalimat ringkas di atas rincian */
  summary?: string;
  changes?: Change[];
  /** Daftar baris terdampak (aksi massal) */
  items?: ConfirmItem[];
  note?: string;
  confirmLabel?: string;
  /** Dijalankan saat Konfirmasi ditekan. Kembalikan teks error bila gagal; jika sukses, induk menutup dialog. */
  onConfirm: () => Promise<string | void> | string | void;
  onCancel: () => void;
};

const TONE = {
  create: { tag: "Tambah data", color: "var(--e600)", bg: "var(--e50)", icon: "M12 5v14M5 12h14" },
  update: { tag: "Ubah data", color: "var(--b600)", bg: "var(--b50)", icon: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" },
  delete: { tag: "Hapus data", color: "var(--r600)", bg: "var(--r50)", icon: "M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" },
  action: { tag: "Konfirmasi tindakan", color: "var(--a700)", bg: "var(--a50)", icon: "M12 8v5M12 16.5v.5M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" },
} as const;

const MAX_ITEMS = 100;

/** Pop up konfirmasi sebelum data diubah: menampilkan rincian apa yang akan terjadi. */
export default function ConfirmDialog({ kind, title, summary, changes, items, note, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tone = TONE[kind];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Tangkap Escape lebih dulu agar hanya dialog ini yang tertutup, bukan form di bawahnya
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (!busy) onCancel();
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onCancel, busy]);

  async function go() {
    setBusy(true); setErr("");
    try {
      const r = await onConfirm();
      if (typeof r === "string") { setErr(r); setBusy(false); }
    } catch { setErr("Terjadi kesalahan. Coba lagi."); setBusy(false); }
  }

  const rows = changes ?? [];
  const hasBefore = rows.some((c) => c.before !== undefined);
  const hasAfter = rows.some((c) => c.after !== undefined);
  const both = hasBefore && hasAfter;
  const shown = (items ?? []).slice(0, MAX_ITEMS);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center p-4 overflow-y-auto" style={{ background: "rgba(8, 12, 24, 0.6)", backdropFilter: "blur(3px)" }}
      onMouseDown={(e) => e.stopPropagation()}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="pop card w-full max-w-xl my-8">
        <div className="flex items-start gap-3 px-5 pt-5">
          <span className="grid place-items-center shrink-0 h-10 w-10 rounded-full" style={{ background: tone.bg, color: tone.color }} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={tone.icon} /></svg>
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium" style={{ color: tone.color }}>{tone.tag}</div>
            <h2 className="font-semibold tracking-tight leading-snug">{title}</h2>
            {summary && <p className="text-sm text-slate-600 mt-1">{summary}</p>}
          </div>
        </div>

        <div className="px-5 pt-4 space-y-3">
          {rows.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="max-h-[48vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="th">Data</th>
                      {both ? <><th className="th">Sebelum</th><th className="th">Sesudah</th></> : <th className="th">{hasBefore ? "Nilai yang dihapus" : "Nilai"}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 align-top text-slate-600 whitespace-nowrap">{c.label}</td>
                        {both ? (
                          <>
                            <td className="px-3 py-2 align-top text-slate-500 break-words">{c.before !== undefined && c.before !== "" ? <span className="line-through decoration-slate-300">{c.before}</span> : <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-2 align-top font-medium break-words">{c.after !== undefined && c.after !== "" ? c.after : <span className="text-slate-400 font-normal">—</span>}</td>
                          </>
                        ) : (
                          <td className="px-3 py-2 align-top font-medium break-words">{(hasBefore ? c.before : c.after) || <span className="text-slate-400 font-normal">—</span>}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {shown.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <ul className="max-h-[40vh] overflow-auto divide-y divide-slate-100 text-sm">
                {shown.map((it, i) => (
                  <li key={i} className="px-3 py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="truncate">{it.primary}</div>{it.secondary && <div className="text-xs text-slate-500 truncate">{it.secondary}</div>}</div>
                    {it.detail && <div className="text-xs text-slate-600 whitespace-nowrap text-right">{it.detail}</div>}
                  </li>
                ))}
              </ul>
              {(items?.length ?? 0) > MAX_ITEMS && <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100">dan {(items!.length - MAX_ITEMS).toLocaleString("id-ID")} lainnya</div>}
            </div>
          )}

          {note && <p className="text-sm rounded-lg px-3 py-2" style={{ background: kind === "delete" ? "var(--r50)" : "var(--a50)", color: kind === "delete" ? "var(--r700)" : "var(--a800)" }}>{note}</p>}
          {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4">
          <button type="button" className="btn" onClick={onCancel} disabled={busy} autoFocus={kind === "delete"}>Batal</button>
          <button type="button" onClick={go} disabled={busy} autoFocus={kind !== "delete"}
            className={kind === "delete" ? "btn-danger" : "btn-primary"}
            style={kind === "delete" ? { background: "#c8372d", color: "#fff", borderColor: "transparent" } : undefined}>
            {busy ? "Memproses…" : confirmLabel ?? (kind === "delete" ? "Ya, hapus" : kind === "create" ? "Ya, tambahkan" : kind === "update" ? "Ya, simpan perubahan" : "Ya, lanjutkan")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
