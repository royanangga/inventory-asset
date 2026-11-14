export type GlAccount = { code: string; name: string; sort_order: number };

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
  remark: string | null;
  mvd_status: string | null;
  mvd_note: string | null;
  trans_ref: string | null;
  expense_coa: string | null;
  expense_amount: number;
  fa_amount: number;
  fa_date: string | null;
  note: string | null;
  source_row: number | null;
};

export type AssetInput = Omit<Asset, "id" | "source_row"> & { source_row?: number | null };

export const ASSET_TEXT_FIELDS = [
  "gl_account","trans_no","vendor","project","ringgisho_no","po_no","div_plant","tgl","product_code",
  "part_number","item_name","claim_to","remark","mvd_status","mvd_note","trans_ref","expense_coa","fa_date","note",
] as const;
export const ASSET_NUM_FIELDS = ["qty","ringgisho_lc","kesaisho_sales","amount","expense_amount","fa_amount"] as const;
