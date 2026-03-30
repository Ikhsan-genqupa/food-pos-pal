

## Tambahkan Data Contoh ke Database

### Apa yang akan dilakukan
Memasukkan data contoh (seed data) ke database berdasarkan data mock yang sudah ada di project:

### Data yang akan dimasukkan

**4 Kategori:**
- Makanan 🍚, Minuman 🥤, Snack 🍿, Dessert 🍨

**6 Produk:**
- Nasi Goreng (Rp 25.000), Mie Goreng (Rp 22.000), Ayam Bakar (Rp 35.000), Sate Ayam (Rp 30.000), Es Teh Manis (Rp 8.000), Jus Jeruk (Rp 15.000)

**2 Outlet contoh:**
- Outlet Pusat (Cabang 001) - Jl. Sudirman No. 1
- Outlet Cabang (Cabang 002) - Jl. Gatot Subroto No. 5

### Langkah teknis
1. Insert kategori ke tabel `categories` dengan UUID tetap agar bisa direferensikan produk
2. Insert produk ke tabel `products` dengan `category_id` yang merujuk ke kategori di atas
3. Insert outlet ke tabel `outlets`
4. Insert stok awal (quantity 0) untuk setiap kombinasi produk-outlet ke tabel `stocks`

Semua insert menggunakan tool insert database (bukan migration), karena ini operasi data bukan perubahan schema.

