import ExcelJS from "exceljs";
import type { AssetInput, ClaimInput } from "./types";

export type ParsedWorkbook = {
  assets: (AssetInput & { source_row: number; claim: ClaimInput | null })[];
  glAccounts: { code: string; name: string }[];
  sheetName: string;
  skipped: { row: number; reason: string }[];
};

type Raw = ExcelJS.CellValue;

function plain(v: Raw): string | number | Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    const o = v as any;
    if ("result" in o) return plain(o.result);
    if ("richText" in o) return o.richText.map((t: any) => t.text).join("");
    if ("text" in o) return String(o.text);
    return null;
  }
  return v as string | number | Date;
}
const str = (v: Raw): string | null => {
  const p = plain(v);
  if (p === null) return null;
  if (p instanceof Date) return p.toISOString().slice(0, 10);
  const s = String(p).trim();
  return s === "" ? null : s;
};
const num = (v: Raw): number => {
  const p = plain(v);
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    const n = Number(p.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/** "15.01.25" | "15.01.2025" | Date -> "2025-01-15" */
export function parseSheetDate(v: Raw): string | null {
  const p = plain(v);
  if (p === null) return null;
  if (p instanceof Date) return p.toISOString().slice(0, 10);
  if (typeof p === "number") {
    const d = new Date(Math.round((p - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const m = String(p).trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (!m) return null;
  const day = +m[1], mon = +m[2];
  const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const SHEET_HINT = /inventory\s*asset/i;

export async function parseWorkbook(input: ArrayBuffer | Buffer | string): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  if (typeof input === "string") await wb.xlsx.readFile(input);
  else await wb.xlsx.load(input as ArrayBuffer);

  // Cari sheet daftar aset: nama mengandung "Inventory asset" dan punya header "Product Code"
  const sheets = wb.worksheets.filter((w) => SHEET_HINT.test(w.name));
  const ws =
    sheets.find((w) => /per/i.test(w.name)) ?? sheets[0] ?? wb.worksheets.find((w) => w.name !== "SUMMARY" && w.name !== "TB");
  if (!ws) throw new Error("Sheet daftar aset tidak ditemukan");

  const assets: ParsedWorkbook["assets"] = [];
  const skipped: ParsedWorkbook["skipped"] = [];
  const gl = new Map<string, string>();

  ws.eachRow({ includeEmpty: false }, (row, r) => {
    if (r < 7) return; // baris header
    const c = (col: string) => row.getCell(col).value;
    const D = str(c("D")), E = str(c("E")), G = str(c("G")), K = str(c("K"));

    if ([D, E].some((x) => x && /^total$/i.test(x)) || [G, K].some((x) => x && /grand\s*total/i.test(x))) return;

    const vendor = E, productCode = K, part = str(c("L")), name = str(c("M"));
    const amountCell = plain(c("R"));
    const hasAmount = typeof amountCell === "number";
    if (!vendor && !productCode && !part && !name && !hasAmount) {
      if (str(c("AB")) || str(c("D"))) skipped.push({ row: r, reason: "Baris catatan tanpa data aset" });
      return;
    }

    const glCode = str(c("B")) ?? str(c("AC")); // B = akun GL detail; AC hanya cadangan bila B kosong
    const glName = str(c("C"));
    if (glCode && glName && !gl.has(glCode)) gl.set(glCode, glName);

    // Claim ke customer: kolom W-AD + Remark (T) / MVD (U-V) / catatan (AF). Hanya dibuat bila ada isinya.
    const claimData: ClaimInput = {
      claimed: false,
      trans_ref: str(c("W")),
      expense_coa: str(c("X")),
      sales_tooling: num(c("Z")),
      expense_amount: num(c("AA")),
      fa_amount: num(c("AB")),
      fa_date: parseSheetDate(c("AD")),
      remark: str(c("T")),
      mvd_status: str(c("U")),
      mvd_note: str(c("V")),
      note: str(c("AF")),
    };
    // data W-AD terisi = aset sudah di-claim; bila hanya Remark/MVD/catatan = baru catatan
    claimData.claimed = !!(claimData.trans_ref || claimData.expense_coa || claimData.sales_tooling || claimData.expense_amount || claimData.fa_amount || claimData.fa_date);
    const hasClaim = claimData.claimed || Object.entries(claimData).some(([k, v]) => k !== "claimed" && (typeof v === "number" ? v !== 0 : !!v));
    const claim = hasClaim ? claimData : null;

    assets.push({
      gl_account: glCode,
      trans_no: D,
      vendor,
      project: str(c("F")),
      ringgisho_no: G,
      po_no: str(c("H")),
      div_plant: str(c("I")),
      tgl: parseSheetDate(c("J")),
      product_code: productCode,
      part_number: part,
      item_name: name,
      qty: num(c("N")),
      ringgisho_lc: num(c("P")),
      kesaisho_sales: num(c("Q")),
      amount: num(c("R")),
      claim_to: str(c("S")) === "0" ? null : str(c("S")),
      due_date: null, // tidak ada di sheet; diisi lewat website
      claim,
      source_row: r,
    });
  });

  // Nama akun GL dari sheet TB (jika ada)
  const tb = wb.getWorksheet("TB");
  const glAccounts = new Map<string, string>(gl);
  if (tb) {
    tb.eachRow((row, r) => {
      if (r < 5) return;
      const code = str(row.getCell("A").value), name = str(row.getCell("B").value);
      if (code && name && /^\d{5,}$/.test(code)) glAccounts.set(code, name);
    });
  }

  return {
    assets,
    glAccounts: [...glAccounts].sort(([a], [b]) => a.localeCompare(b)).map(([code, name]) => ({ code, name })),
    sheetName: ws.name,
    skipped,
  };
}
