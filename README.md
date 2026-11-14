# Inventory Asset

Website daftar **Inventory Asset** (dari sheet "Inventory asset per okt26") dengan menu **Rekonsiliasi TB**.
Stack: Next.js 15 (App Router) · TypeScript · Tailwind v4 · PostgreSQL (`postgres.js`) · siap deploy ke Vercel.

## Fitur
- **Dashboard** – total aset, per akun GL, per Div#Plant, per project, pemeriksaan kualitas data (duplikat, nilai ≤ 0, tanpa akun GL).
- **Daftar Aset** – detail inventory asset (**kolom B–T** di Excel; tanpa Remark/MVD/Expense/FA). Cari/filter, tambah/ubah/hapus,
  pindahkan akun GL secara massal, **impor** & **ekspor** Excel, dan tombol **Claim** per baris.
- **Claim Customer** – aset yang sudah di-claim ke customer: **kolom W–AD** (Trans, COA, Sales Tooling, Expense, FA Amount, Date)
  + Remark, MVD, dan tanggal jatuh tempo. Filter jatuh tempo, ekspor Excel.
- **Rekonsiliasi TB** – isi saldo TB per akun GL → sistem menghitung saldo daftar aset, selisih, status per akun;
  telusuri rincian aset, catat penyesuaian/penjelasan selisih, petunjuk penyebab, simpan sebagai draft,
  **finalkan** (saldo sistem dikunci sebagai snapshot), buka kembali, ekspor ke Excel.
- Login dengan satu password (`APP_PASSWORD`).

## Menjalankan lokal
```bash
npm install
cp .env.example .env.local      # isi DATABASE_URL, APP_PASSWORD, AUTH_SECRET
npm run db:setup                # (opsional, via terminal) buat tabel + impor Excel; atau pakai halaman /setup di browser
npm run dev                     # http://localhost:3000
```
Tanpa `APP_PASSWORD` di mode development, login dimatikan. Di production login **wajib**.

## Deploy ke Vercel (cukup dari browser)
1. **GitHub:** buat repository baru di github.com → *Add file → Upload files* → seret seluruh isi folder project ini
   (tanpa `node_modules`/`.next`) → *Commit*.
2. **Vercel:** *Add New → Project* → pilih repository tadi → sebelum *Deploy*, buka **Environment Variables** dan isi
   `APP_PASSWORD` (password masuk) dan `AUTH_SECRET` (teks acak panjang, mis. 40+ karakter). Klik *Deploy*.
3. **Database:** di project Vercel buka tab **Storage → Create Database → Neon (Postgres)** → *Connect to Project*.
   Vercel otomatis menambahkan `DATABASE_URL` (jika namanya `POSTGRES_URL`, tambahkan variabel `DATABASE_URL` berisi nilai yang sama).
   Lalu **Redeploy** (Deployments → ⋯ → Redeploy).
4. Buka website → login → Anda otomatis diarahkan ke halaman **Setup**: klik *Buat tabel*, lalu unggah
   `Inventory_asset_2026.xlsx` → *Impor Excel*. Selesai.

## Alur pencatatan
1. Aset yang sudah dibeli dicatat di **Daftar Aset** (detail inventory = kolom B–T). Hanya kolom *Inventory Asset* yang masuk saldo & rekonsiliasi TB.
2. Setelah ada **tanggal jatuh tempo**, klik **Claim** pada aset → isi data claim (W–AD, Remark, MVD). Aset tampil di menu **Claim Customer**.
3. Aset dianggap *Diclaim* bila punya tanggal jatuh tempo atau data W–AD. Aset yang hanya punya Remark/MVD dari Excel berstatus *Catatan*
   (terlihat di Claim Customer → filter “Hanya catatan”). Membatalkan claim tidak menghapus aset.

Update database lama: jalankan halaman **/setup** → *Buat tabel* (atau `npm run db:migrate`). Kolom Remark/MVD/Expense/FA di tabel `assets`
otomatis dipindahkan ke tabel `asset_claims` lalu dihapus dari `assets`.

Update data bulanan: **Daftar Aset → Impor Excel → Ganti semua data**.

## Cara kerja rekonsiliasi
- Selisih = **Saldo TB − Saldo Sistem**. Saldo sistem = jumlah kolom *Inventory Asset* per akun GL (kolom COA di Excel).
- Status: *Sesuai* (selisih ≤ Rp 1), *Selisih terjelaskan* (selisih = total penyesuaian), *Ada selisih*, *Belum diisi*.
- Penyesuaian bersifat catatan penjelasan (tidak mengubah daftar aset). Untuk memperbaiki akun GL aset gunakan
  Daftar Aset → pilih baris → "Pindahkan ke akun GL".
- Rekonsiliasi **Final** menyimpan snapshot saldo sistem, sehingga perubahan aset sesudahnya tidak mengubah hasil.

## Struktur
`sql/schema.sql` skema (tabel `assets` = detail, `asset_claims` = claim) · `lib/excel.ts` parser Excel · `lib/recon.ts` logika rekonsiliasi (diuji: `npx tsx scripts/test-recon.ts`)
· `app/` halaman & API · `scripts/` migrasi & seed.
