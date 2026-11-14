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

## Tampilan & pintasan
- **Tema terang/gelap** (tombol bulan/matahari, mengikuti pengaturan perangkat) dan **mode privasi** (nominal diburamkan, arahkan kursor untuk mengintip).
- **Pencarian cepat** `Ctrl/⌘ + K`: cari aset langsung dari database, buka halaman, jalankan tampilan siap pakai (jatuh tempo, duplikat, tanpa GL, dst).
- Pintasan: `/` fokus ke pencarian, `g` lalu `d` / `a` / `c` / `r` pindah ke Dashboard / Aset / Claim / Rekonsiliasi.
- Dashboard: **Claim Radar** (jatuh tempo 45 hari, klik batang untuk membuka asetnya), peta pohon nilai per project, skor kesehatan data.
- Rekonsiliasi: batang selisih per akun, cap tanggal **FINAL** saat difinalkan, penanda saat semua akun seimbang.

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
2. Isi **Tanggal jatuh tempo** pada aset (satu per satu lewat *Ubah*, atau banyak sekaligus: centang baris → *Atur jatuh tempo*).
3. **Alert**: aset yang belum diclaim dan tanggalnya sudah tiba/lewat muncul sebagai banner merah di semua halaman, badge merah di menu
   *Daftar Aset*, baris merah + tombol **Claim sekarang**. Aset yang jatuh tempo ≤ 7 hari muncul sebagai banner kuning.
   Filter *Jatuh tempo* di Daftar Aset: Saatnya di-claim / Dalam 7 hari / Belum ada tanggal / Sudah diclaim.
4. Klik **Claim** → isi data claim (W–AD, Remark, MVD) dan centang *Sudah di-claim ke customer*. Aset tampil di menu **Claim Customer**
   dan alert-nya hilang. Aset yang hanya punya Remark/MVD dari Excel berstatus *Catatan* (belum diclaim).
5. Impor Excel mode *Ganti semua data*: tanggal jatuh tempo dan data claim yang diisi di website dipertahankan untuk aset yang cocok
   (PO + kode/part/nama + nilai yang sama).

Update database lama: **otomatis** — setiap deploy/start, aplikasi menjalankan migrasi skema sendiri (`instrumentation.ts`), tidak perlu membuka /setup. Kolom Remark/MVD/Expense/FA di tabel `assets`
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
