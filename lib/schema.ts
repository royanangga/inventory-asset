// Salinan sql/schema.sql sebagai string agar ikut ter-bundle di Vercel
export const SCHEMA_SQL = `-- Skema database Inventory Asset (idempotent: aman dijalankan berulang)

CREATE TABLE IF NOT EXISTS gl_accounts (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
  id              serial PRIMARY KEY,
  gl_account      text REFERENCES gl_accounts(code) ON UPDATE CASCADE,
  trans_no        text,            -- TRANS (kolom D)
  vendor          text,            -- Vendor
  project         text,            -- Project / Model
  ringgisho_no    text,            -- No. Ringgisho
  po_no           text,            -- PO
  div_plant       text,            -- Div#Plant
  tgl             date,            -- Tgl
  product_code    text,            -- Product Code
  part_number     text,            -- Part Number
  item_name       text,            -- Nama Barang
  qty             numeric(18,2) NOT NULL DEFAULT 0,
  ringgisho_lc    numeric(20,2) NOT NULL DEFAULT 0,  -- RINGGISHO PUR (LC)
  kesaisho_sales  numeric(20,2) NOT NULL DEFAULT 0,  -- KESAISHO - SALES
  amount          numeric(20,2) NOT NULL DEFAULT 0,  -- INVENTORY ASSET (PURCHASE)
  claim_to        text,            -- CUSTOMER MVD (Claim ADM / Claim TBINA)
  remark          text,            -- REMARK
  mvd_status      text,            -- MVD
  mvd_note        text,            -- MVD (kolom V)
  trans_ref       text,            -- Trans (kolom W)
  expense_coa     text,            -- COA expense
  expense_amount  numeric(20,2) NOT NULL DEFAULT 0,  -- EXPENSE AMOUNT
  fa_amount       numeric(20,2) NOT NULL DEFAULT 0,  -- FA AMOUNT
  fa_date         text,            -- DATE (FA)
  note            text,            -- catatan lain (kolom AF)
  source_row      int,             -- nomor baris di Excel (untuk penelusuran)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_gl_idx      ON assets(gl_account);
CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project);

CREATE TABLE IF NOT EXISTS reconciliations (
  id          serial PRIMARY KEY,
  title       text NOT NULL,
  as_of       date NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);

CREATE TABLE IF NOT EXISTS reconciliation_lines (
  id                 serial PRIMARY KEY,
  reconciliation_id  int NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  gl_account         text NOT NULL,
  gl_name            text,
  tb_balance         numeric(20,2),            -- saldo TB yang diinput user
  system_balance     numeric(20,2),            -- snapshot saldo sistem saat difinalkan
  system_count       int,
  UNIQUE (reconciliation_id, gl_account)
);

CREATE TABLE IF NOT EXISTS reconciliation_adjustments (
  id                 serial PRIMARY KEY,
  reconciliation_id  int NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  gl_account         text NOT NULL,
  description        text NOT NULL,
  amount             numeric(20,2) NOT NULL    -- arah sama dengan selisih (TB - Sistem)
);
CREATE INDEX IF NOT EXISTS recon_adj_idx ON reconciliation_adjustments(reconciliation_id);
`;
