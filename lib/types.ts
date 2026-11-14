export type GlAccount = { code: string; name: string; sort_order: number };

/** Detail inventory asset = kolom B-T di sheet (tanpa Remark/MVD). */
export type Asset = {
  id: number;
  gl_account: string | null;
  trans_no: string | null;
  vendor: string | null;
  project: string | null;
  ringgisho_no: string | null;
  po_no: string | null;
  div_plant: string | null;
  tgl: string | null;
  product_code: string | null;
  part_number: string | null;
  item_name: string | null;
  qty: number;
  ringgisho_lc: number;
  kesaisho_sales: number;
  amount: number;
  claim_to: string | null;
  due_date: string | null;       // tanggal jatuh tempo: saatnya di-claim ke customer
  payment_status: string;        // status pembayaran: salah satu PAYMENT_STATUSES
  source_row: number | null;
};

/** Urutan tahap pembayaran. Tambah "DP 6" dst. di sini bila perlu; "FINAL" harus tetap terakhir. */
export const PAYMENT_STATUSES = ["DP 1", "DP 2", "DP 3", "DP 4", "DP 5", "FINAL"] as const;
export const stageIndex = (s: string) => (PAYMENT_STATUSES as readonly string[]).indexOf(s);
/** Tahap terakhir (tertinggi) dari daftar pembayaran = status pembayaran aset. */
export const latestStage = (stages: string[]) => stages.reduce((a, b) => (stageIndex(b) > stageIndex(a) ? b : a), stages[0] ?? "FINAL");
export type AssetPayment = { id: number; asset_id: number; stage: string; amount: number; pay_date: string | null };

export const DEFAULT_PAYMENT_STATUS = "FINAL";
export const isPaymentStatus = (v: unknown): v is string => typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);

export type AssetInput = Omit<Asset, "id" | "source_row"> & { source_row?: number | null };

/** Baris daftar aset + status claim (untuk tabel Daftar Aset). */
export type AssetRow = Asset & { claim_id: number | null; claimed: boolean };

/**
 * Keterangan claim ke customer (kolom W-AD di sheet) + catatan tindak lanjut
 * (Remark, MVD) + tanggal jatuh tempo. Satu aset maksimal satu claim.
 */
export type Claim = {
  id: number;
  asset_id: number;
  claimed: boolean;              // sudah di-claim ke customer
  trans_ref: string | null;      // W  Trans (nomor JV)
  expense_coa: string | null;    // X  COA expense
  sales_tooling: number;         // Z  Sales Tooling Amount
  expense_amount: number;        // AA Expense Amount
  fa_amount: number;             // AB FA Amount
  fa_date: string | null;        // AD Date
  remark: string | null;         // Remark
  mvd_status: string | null;     // MVD
  mvd_note: string | null;       // MVD (target/keterangan)
  note: string | null;           // catatan lain (kolom AF)
};
export type ClaimInput = Omit<Claim, "id" | "asset_id">;

export type ClaimRow = Claim & {
  gl_account: string | null; vendor: string | null; project: string | null; po_no: string | null;
  item_name: string | null; claim_to: string | null; amount: number; due_date: string | null;
};

export const ASSET_TEXT_FIELDS = [
  "gl_account","trans_no","vendor","project","ringgisho_no","po_no","div_plant","tgl","product_code",
  "part_number","item_name","claim_to","due_date",
] as const;
export const ASSET_NUM_FIELDS = ["qty","ringgisho_lc","kesaisho_sales","amount"] as const;

export const CLAIM_TEXT_FIELDS = [
  "trans_ref","expense_coa","fa_date","remark","mvd_status","mvd_note","note",
] as const;
export const CLAIM_NUM_FIELDS = ["sales_tooling","expense_amount","fa_amount"] as const;
