# Catatan Cupang

Aplikasi web pencatatan bisnis cupang: harga beli, harga jual, profit otomatis, filter, dan ekspor CSV.
Dibangun dengan Next.js (App Router) + Neon Postgres. Dilindungi satu password.

## Fitur

- Catat cupang: nama/kode, jenis, warna, gender, ukuran, supplier, catatan
- Harga beli + tanggal beli, harga jual + tanggal jual + pembeli
- Tombol cepat **Terjual** di setiap baris stok
- Profit per ekor, dan ringkasan: jumlah stok, modal stok, omzet, profit, margin
- Filter: pencarian teks, status, jenis, gender, rentang tanggal (beli/jual), 8 pilihan urutan
- Ringkasan otomatis mengikuti filter yang aktif
- Ekspor CSV (hasil filter), tampilan nyaman di HP

## Jalankan di laptop

```bash
npm install
cp .env.example .env.local     # lalu isi APP_PASSWORD
npm run dev
```

Buka http://localhost:3000. Tanpa `DATABASE_URL`, data disimpan di `data/cupang.json`
(hanya untuk development; fallback ini otomatis nonaktif di production).

## Deploy ke Vercel

1. Upload project ke GitHub (folder `node_modules`, `.next`, `data`, `.env.local` sudah di-ignore).
2. Di Vercel: **Add New → Project**, pilih repo itu, lalu **Deploy**.
3. Di project Vercel buka tab **Storage → Create Database → Neon** (Marketplace),
   pilih region (Singapore paling dekat), lalu **Connect to Project**.
   `DATABASE_URL` terisi otomatis.
4. Buka **Settings → Environment Variables**, tambah `APP_PASSWORD` dengan password kuat.
5. **Deployments → Redeploy** supaya variabel baru terbaca.

Tabel database dibuat otomatis saat pertama kali dipakai, tidak perlu migrasi manual.

## Struktur

```
app/page.js              UI utama (login, tabel, form, filter)
app/api/auth/route.js    login / logout
app/api/cupang/...       CRUD data
lib/db.js                akses database + validasi input
lib/auth.js              sesi berbasis cookie
```
