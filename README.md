# SiapGuru Admin

Panel admin ringan untuk:

- login admin via Supabase Auth
- simpan OpenRouter dan Cloudinary secret di backend
- generate dan kelola license key guru
- sinkronisasi license ke Firebase Firestore
- validasi license dari aplikasi desktop
- proxy request AI dan upload file cloud dari desktop

## Stack

- Next.js App Router
- JavaScript
- Tailwind CSS
- Komponen gaya `shadcn/ui`
- Supabase Auth + Postgres
- Firebase Admin SDK
- OpenRouter
- Cloudinary

## Menjalankan project

1. Salin `.env.example` menjadi `.env.local`
2. Isi env Supabase dan Firebase
3. Jalankan schema di `supabase/schema.sql`
4. Install dependency dan jalankan dev server

```bash
npm install
npm run dev
```

## Catatan penting

- `ServiceAccountKey.json` harus disimpan lokal/server dan sudah di-ignore git.
- Endpoint desktop ada di `app/api/desktop/*`.
- Endpoint admin internal ada di `app/api/admin/*`.
