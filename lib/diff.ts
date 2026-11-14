import { fmt, fmtDate } from "./format";
import type { Change } from "../components/ConfirmDialog";

export type FieldDef = {
  key: string;
  label: string;
  kind?: "text" | "num" | "date" | "bool";
  /** Ubah nilai mentah menjadi teks tampilan (mis. kode GL → "kode · nama") */
  show?: (v: string) => string;
};

/** Teks tampilan satu nilai; kosong → "" */
export function showValue(d: FieldDef, v: string | undefined): string {
  const s = (v ?? "").trim();
  if (d.kind === "bool") return s === "true" ? "Ya" : s === "false" ? "Tidak" : "";
  if (s === "") return "";
  if (d.show) return d.show(s);
  if (d.kind === "num") { const n = Number(s); return Number.isFinite(n) ? fmt(n) : s; }
  if (d.kind === "date") return fmtDate(s);
  return s;
}

function same(d: FieldDef, a: string | undefined, b: string | undefined) {
  const x = (a ?? "").trim(), y = (b ?? "").trim();
  if (d.kind === "num") return (x === "" ? 0 : Number(x)) === (y === "" ? 0 : Number(y));
  return x === y;
}

/** Hanya field yang berubah, sebagai Sebelum → Sesudah. */
export function diffForm(defs: FieldDef[], before: Record<string, string>, after: Record<string, string>): Change[] {
  return defs.filter((d) => !same(d, before[d.key], after[d.key]))
    .map((d) => ({ label: d.label, before: showValue(d, before[d.key]), after: showValue(d, after[d.key]) }));
}

/** Field yang terisi, sebagai nilai tunggal (untuk data baru atau data yang dihapus). */
export function listForm(defs: FieldDef[], form: Record<string, string>, as: "after" | "before"): Change[] {
  const out: Change[] = [];
  for (const d of defs) {
    if (d.kind === "num" && (form[d.key] ?? "") !== "" && Number(form[d.key]) === 0) continue;
    const v = showValue(d, form[d.key]);
    if (v !== "") out.push({ label: d.label, [as]: v });
  }
  return out;
}
