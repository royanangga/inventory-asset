-- Skema database Inventory Asset (idempotent: aman dijalankan berulang)

CREATE TABLE IF NOT EXISTS gl_accounts (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

-- Detail inventory asset = kolom B-T di sheet (tanpa Remark/MVD)
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
  due_date        date,            -- tanggal jatuh tempo (saatnya aset di-claim ke customer)
  payment_status  text NOT NULL DEFAULT 'FINAL',  -- status pembayaran: DP 1, DP 2, ... FINAL
  source_row      int,             -- nomor baris di Excel (untuk penelusuran)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_gl_idx      ON assets(gl_account);
CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project);
-- database lama (sebelum kolom jatuh tempo ada)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS due_date date;
CREATE INDEX IF NOT EXISTS assets_due_idx ON assets(due_date);
-- status pembayaran (DP bertahap); aset yang sudah ada otomatis berstatus FINAL
ALTER TABLE assets ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'FINAL';

-- Riwayat pembayaran per aset: DP 1, DP 2, ... FINAL. Inventory Asset (Purchase) = jumlah seluruh pembayaran.
-- Aset yang sudah ada dibuatkan satu pembayaran sesuai status & nilainya sekarang (hanya saat tabel pertama kali dibuat).
DO $$
BEGIN
  IF to_regclass('asset_payments') IS NULL THEN
    CREATE TABLE asset_payments (
      id          serial PRIMARY KEY,
      asset_id    int NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      stage       text NOT NULL,                      -- DP 1, DP 2, ..., FINAL
      amount      numeric(20,2) NOT NULL DEFAULT 0,   -- nominal pembayaran tahap ini
      pay_date    date,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (asset_id, stage)
    );
    INSERT INTO asset_payments (asset_id, stage, amount) SELECT id, payment_status, amount FROM assets;
  END IF;
END $$;

-- Claim ke customer = kolom W-AD di sheet + Remark/MVD (maks. satu claim per aset). Tanggal jatuh tempo ada di tabel assets.
CREATE TABLE IF NOT EXISTS asset_claims (
  id              serial PRIMARY KEY,
  asset_id        int NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  claimed         boolean NOT NULL DEFAULT false,    -- true = sudah di-claim ke customer; false = baru catatan Remark/MVD
  trans_ref       text,                              -- Trans (kolom W)
  expense_coa     text,                              -- COA expense (kolom X)
  sales_tooling   numeric(20,2) NOT NULL DEFAULT 0,  -- SALES TOOLING AMOUNT (kolom Z)
  expense_amount  numeric(20,2) NOT NULL DEFAULT 0,  -- EXPENSE AMOUNT (kolom AA)
  fa_amount       numeric(20,2) NOT NULL DEFAULT 0,  -- FA AMOUNT (kolom AB)
  fa_date         date,                              -- DATE (kolom AD)
  remark          text,                              -- REMARK
  mvd_status      text,                              -- MVD
  mvd_note        text,                              -- MVD (kolom V)
  note            text,                              -- catatan lain (kolom AF)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE asset_claims ADD COLUMN IF NOT EXISTS claimed boolean NOT NULL DEFAULT false;

-- Migrasi database lama: pindahkan kolom Remark/MVD/Expense/FA dari assets ke asset_claims, lalu hapus kolomnya
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'assets' AND column_name = 'expense_amount') THEN
    INSERT INTO asset_claims (asset_id, trans_ref, expense_coa, expense_amount, fa_amount, fa_date, remark, mvd_status, mvd_note, note, claimed)
    SELECT id, trans_ref, expense_coa, expense_amount, fa_amount,
           CASE WHEN fa_date ~ '^\d{4}-\d{2}-\d{2}$' THEN fa_date::date
                WHEN fa_date ~ '^\d{1,2}\.\d{1,2}\.\d{2}$'
                  THEN to_date(fa_date, 'DD.MM.YY') END,
           remark, mvd_status, mvd_note, note,
           (coalesce(trans_ref,'') <> '' OR expense_amount <> 0 OR fa_amount <> 0 OR coalesce(fa_date,'') <> '')
    FROM assets
    WHERE coalesce(trans_ref,'') <> '' OR coalesce(expense_coa,'') <> '' OR expense_amount <> 0 OR fa_amount <> 0
       OR coalesce(fa_date,'') <> '' OR coalesce(remark,'') <> '' OR coalesce(mvd_status,'') <> ''
       OR coalesce(mvd_note,'') <> '' OR coalesce(note,'') <> ''
    ON CONFLICT (asset_id) DO NOTHING;
    ALTER TABLE assets DROP COLUMN trans_ref, DROP COLUMN expense_coa, DROP COLUMN expense_amount, DROP COLUMN fa_amount,
      DROP COLUMN fa_date, DROP COLUMN remark, DROP COLUMN mvd_status, DROP COLUMN mvd_note, DROP COLUMN note;
  END IF;
END $$;

-- Migrasi versi sebelumnya: tanggal jatuh tempo pindah dari asset_claims ke assets; claimed = ada tanggal jatuh tempo / data claim W-AD
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'asset_claims' AND column_name = 'due_date') THEN
    UPDATE assets a SET due_date = c.due_date FROM asset_claims c WHERE c.asset_id = a.id AND c.due_date IS NOT NULL AND a.due_date IS NULL;
    UPDATE asset_claims SET claimed = true
      WHERE due_date IS NOT NULL OR coalesce(trans_ref,'') <> '' OR expense_amount <> 0 OR fa_amount <> 0
         OR sales_tooling <> 0 OR fa_date IS NOT NULL;
    ALTER TABLE asset_claims DROP COLUMN due_date;
  END IF;
END $$;

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
