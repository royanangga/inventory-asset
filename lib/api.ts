import { NextResponse } from "next/server";
import { ASSET_NUM_FIELDS, ASSET_TEXT_FIELDS, CLAIM_NUM_FIELDS, CLAIM_TEXT_FIELDS } from "./types";
import { parseNumber } from "./format";

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/** Bersihkan payload aset dari klien menjadi objek yang aman dimasukkan ke SQL */
export function cleanAsset(body: any) {
  const out: Record<string, any> = {};
  for (const f of ASSET_TEXT_FIELDS) {
    const v = body?.[f];
    out[f] = v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim();
  }
  for (const f of ["tgl", "due_date"]) if (out[f] && !/^\d{4}-\d{2}-\d{2}$/.test(out[f])) out[f] = null;
  for (const f of ASSET_NUM_FIELDS) out[f] = parseNumber(body?.[f]) ?? 0;
  return out;
}

/** Bersihkan payload claim dari klien */
export function cleanClaim(body: any) {
  const out: Record<string, any> = {};
  for (const f of CLAIM_TEXT_FIELDS) {
    const v = body?.[f];
    out[f] = v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim();
  }
  for (const f of ["fa_date"]) if (out[f] && !/^\d{4}-\d{2}-\d{2}$/.test(out[f])) out[f] = null;
  for (const f of CLAIM_NUM_FIELDS) out[f] = parseNumber(body?.[f]) ?? 0;
  out.claimed = body?.claimed === true || body?.claimed === "true";
  return out;
}
