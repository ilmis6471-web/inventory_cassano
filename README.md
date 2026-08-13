# 🥀 Inventory Cassano

Inventory & Order Management System untuk Cassano Famiglia.

## Fitur

- Login
- Role **Bos / Consigliere / Fixer**
- User management
- Role & permission management
- Inventory barang
- Upload / edit foto barang
- Keranjang
- Pesanan pending
- ACC / Tolak oleh Bos atau Consigliere
- Stok otomatis berkurang setelah ACC
- Stok masuk
- Riwayat
- Dashboard
- Docker
- Render deployment
- Persistent storage

## Cara online: GitHub → Render

> **Penting:** GitHub adalah tempat menyimpan source code. GitHub Pages tidak bisa menjalankan backend login/database aplikasi ini. Untuk website online, repository GitHub dihubungkan ke Render sebagai Web Service.

### 1. Upload ke GitHub

Buat repository baru, misalnya:

`inventory-cassano`

Upload **semua file di folder ini** ke repository tersebut.

Jangan upload:
- `node_modules`
- `data`
- `uploads`

### 2. Hubungkan GitHub ke Render

Buka Render dan pilih:

**New → Web Service → Git Provider → GitHub**

Pilih repository `inventory-cassano`.

Repository GitHub dapat berupa public atau private; Render mendukung deployment dari repository yang terhubung. 

### 3. Gunakan Docker

Pada pengaturan service pilih:

- Runtime / Language: **Docker**
- Branch: `main`

Repository sudah memiliki `Dockerfile` sehingga Render akan membangun aplikasi dari Dockerfile.

### 4. Persistent storage

Karena Inventory Cassano menyimpan database dan foto, gunakan **Persistent Disk** pada Render.

Mount path:

`/app/data`

Environment variable:

`UPLOAD_DIR=/app/data/uploads`

`SESSION_SECRET` buat sebagai secret acak yang panjang.

Tanpa persistent disk, filesystem Render bersifat ephemeral sehingga database/foto lokal dapat hilang saat deploy/restart. Persistent disk hanya tersedia pada service Render yang mendukungnya dan memiliki keterbatasan scaling. 

### 5. Deploy

Klik **Create Web Service**.

Setelah build selesai, Render memberikan alamat seperti:

`https://inventory-cassano.onrender.com`

Render juga bisa melakukan auto-deploy setiap kali branch GitHub yang terhubung menerima perubahan. 

## Custom domain

Setelah website hidup:

**Render → Service → Settings → Custom Domains → Add Custom Domain**

Contoh:

`inventory.domainkamu.com`

Kemudian ikuti DNS record yang diberikan Render di penyedia domain.

Render otomatis menyediakan dan memperbarui TLS/HTTPS untuk custom domain. 

## Login awal

Email:

`bos@cassano.local`

Password:

`bos123`

**Segera buat akun Bos baru dan nonaktifkan akun default setelah deployment.**

## Alur pemesanan

```text
FIXER
  ↓
Pilih barang
  ↓
Keranjang
  ↓
Kirim Pesanan
  ↓
PENDING
  ↓
BOS / CONSIGLIERE
  ↓
ACC ─────────→ Stok berkurang
  │
  └── TOLAK → REJECTED
```

## Catatan produksi

Versi ini memakai SQLite agar setup awal sederhana. Untuk penggunaan besar/multi-instance, lebih baik migrasi ke PostgreSQL dan object storage.

