import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { parseWorkbook } from "../../../../lib/excel";
import { importParsed } from "../../../../lib/importer";
import { bad } from "../../../../lib/api";

export const maxDuration = 60;

/** POST multipart: file (.xlsx), mode = "replace" | "append", dry = "1" untuk pratinjau tanpa menyimpan */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return bad("File Excel (.xlsx) wajib diunggah");
  if (!/\.xlsx$/i.test(file.name)) return bad("Hanya file .xlsx yang didukung");
  const mode = form?.get("mode") === "append" ? "append" : "replace";
  let parsed;
  try {
    parsed = await parseWorkbook(await file.arrayBuffer());
  } catch (e: any) {
    return bad("Gagal membaca file: " + (e?.message ?? "format tidak dikenali"));
  }
  if (!parsed.assets.length) return bad("Tidak ada baris aset yang ditemukan di sheet " + parsed.sheetName);
  const summary = {
    sheet: parsed.sheetName,
    rows: parsed.assets.length,
    claims: parsed.assets.filter((a) => a.claim).length,
    total: parsed.assets.reduce((s, a) => s + a.amount, 0),
    skipped: parsed.skipped,
  };
  if (form?.get("dry") === "1") return NextResponse.json({ dry: true, ...summary });
  const res = await importParsed(sql, parsed, mode);
  return NextResponse.json({ dry: false, mode, ...summary, inserted: res.inserted });
}
