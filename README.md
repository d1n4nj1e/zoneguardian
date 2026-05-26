# ZoneGuardian

## Ringkasan
ZoneGuardian adalah aplikasi monitoring geofence untuk operasi lapangan dan pengawasan zona. Aplikasi ini mendukung dua peran utama:

- **Operator**: memantau lokasi, pelacakan, dan pelanggaran zona secara real-time.
- **Supervisor**: mengelola zona, tugas penugasan, dan riwayat pelanggaran.

Aplikasi ini dibangun dengan React + TypeScript menggunakan Vite, dan terintegrasi dengan Supabase sebagai backend/data store.

## Fitur Utama

- Autentikasi pengguna dengan Supabase
- Dashboard operator dan supervisor terpisah
- Manajemen zona dan tipe zona
- Penugasan dan riwayat penugasan zona
- Monitoring pelanggaran geofence dan dukungan elevasi
- Peta interaktif dengan Leaflet / Google Maps
- UI modern menggunakan Tailwind CSS dan komponen `shadcn-ui`

## Teknologi

- `React` + `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Supabase` (`@supabase/supabase-js`)
- `React Router` untuk routing
- `@tanstack/react-query` untuk fetching data
- `react-leaflet` dan `@react-google-maps/api` untuk peta
- `zod` untuk validasi
- `Vitest` untuk testing

## Struktur Proyek

- `src/App.tsx` - routing aplikasi dan proteksi otentikasi
- `src/pages/` - halaman aplikasi
- `src/components/` - komponen UI dan logika presentasi
- `src/contexts/AuthContext.tsx` - manajemen sesi dan user
- `src/lib/supabase.ts` - konfigurasi Supabase client
- `src/lib/geofence.ts` - logika status geofence dan elevasi
- `database_migrations/` - skrip migrasi database (mis. batas elevasi)

## Persiapan Lokal

### Prasyarat

- Node.js 18+ atau kompatibel
- npm atau bun (package manager yang digunakan pada repo ini adalah npm)

### Installasi

```bash
cd "d:/Games/New folder/PROYEK DINAN/1. ZONEGUARDIAN"
npm install
```

### Menjalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:5173` di browser.

### Build Produksi

```bash
npm run build
```

### Preview Build Produksi

```bash
npm run preview
```

## Catatan Konfigurasi Supabase

Konfigurasi Supabase saat ini disimpan di `src/lib/supabase.ts` dengan URL dan anon key publik. Jika ingin mengganti project Supabase, update nilai berikut:

- `supabaseUrl`
- `supabaseAnonKey`

## Script NPM

- `npm run dev` - jalankan server pengembangan
- `npm run build` - bangun aplikasi untuk produksi
- `npm run preview` - preview hasil build produksi
- `npm run lint` - jalankan ESLint
- `npm run test` - jalankan Vitest
- `npm run test:watch` - jalankan Vitest dalam mode watch

## Pengembangan

1. Pastikan Supabase backend dan struktur tabel siap.
2. Login sebagai `operator` atau `supervisor`.
3. Supervisor dapat mengakses halaman:
   - `/supervise`
   - `/assignments`
   - `/assignment-history`
   - `/zones`
   - `/zone-types`
4. Operator dapat mengakses halaman:
   - `/operate`


