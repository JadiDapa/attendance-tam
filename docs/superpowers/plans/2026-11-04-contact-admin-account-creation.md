# Informasi Kontak Pembuatan Akun & Redirect /request-account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup akses form mandiri `/request-account` dengan melakukan redirect langsung ke `/login`, serta menyajikan informasi kontak resmi administrator (email: `admin@tarunagroup.co.id`) pada halaman login menggunakan dialog modal yang serasi dengan desain default sistem otentikasi proyek demi alasan keamanan.

**Architecture:** 
1. **Halaman `/login`**: Tautan navigasi ke form mandiri `/request-account` diganti dengan trigger modal dialog interaktif (`ContactAdminDialog`) yang memuat kontak resmi admin (`admin@tarunagroup.co.id`) serta petunjuk pengajuan pembuatan akun langsung melalui Admin/HR.
2. **Halaman `/request-account`**: Seluruh form input mandiri dinonaktifkan, komponen kartu informasi dihapus, dan halaman melakukan redirect otomatis secara instan menuju `/login` menggunakan `redirect("/login")` dari `next/navigation`.
3. **Styling & Konsistensi UI/UX**: Seluruh komponen baru sepenuhnya mengadopsi standar visual auth proyek:
   - Border pill input khas sistem (`border-primary rounded-full border-2 bg-background h-10 lg:h-12`).
   - Lingkaran ikon aksen khas proyek (`bg-accent rounded-full size-14` dengan `text-primary`).
   - Pustaka ikon Radix UI (`@radix-ui/react-icons`) yang konsisten dengan `LoginForm`.
   - Feedback notifikasi toast saat salin email melalui `sonner`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, `@radix-ui/react-icons`, Sonner Toast.

---

## Global Constraints
- Jangan menghapus schema database atau merusak backend existing (`prisma/schema.prisma` dan service admin tetap aman).
- Pertahankan struktur routing Next.js 16 dan proteksi rute di `proxy.ts`.
- Gunakan acuan kontak proyek yang sudah ada: `admin@tarunagroup.co.id` dan institusi PT Taruna Anugerah Mandiri.
- Seluruh kode harus lulus validasi TypeScript (`npx tsc --noEmit`) dengan 0 error dan lolos audit linter (`eslint`).

---

## File Structure & Responsibilities

| File | Status | Tanggung Jawab |
| :--- | :--- | :--- |
| `components/auth/ContactAdminDialog.tsx` | Selesai | Komponen dialog bantuan kontak admin dengan styling native auth project (`border-primary rounded-full`, Radix UI icons), tombol salin email, dan tombol `mailto:`. |
| `app/(auth)/login/page.tsx` | Selesai | Menampilkan dialog kontak admin pada teks *"Belum punya akun? Hubungi admin"*. |
| `app/(auth)/request-account/page.tsx` | Selesai | Melakukan redirect langsung ke `/login` via `redirect("/login")`. |
| `components/auth/AccountRequestInfoCard.tsx` | Dihapus | Komponen dihapus per instruksi pengguna karena digantikan oleh redirect langsung ke `/login`. |

---

## Log Riwayat Keputusan & Perubahan (Changelog)

1. **Inisialisasi Fitur**:
   - Menutup celah keamanan form pengajuan publik `/request-account`.
   - Mengalihkan pengguna agar menghubungi administrator/HR secara langsung via email resmi.
2. **Iterasi UI/UX (Paritas Desain Default Proyek)**:
   - Mengganti gaya generic card dengan styling default auth TAM: input kapsul (`border-primary border-2 rounded-full`), lingkaran aksen (`bg-accent flex rounded-full`), dan ikon Radix UI (`EnvelopeClosedIcon`, `CopyIcon`, `CheckIcon`).
3. **Penyederhanaan Alur Navigasi**:
   - Menghapus komponen `AccountRequestInfoCard.tsx`.
   - Mengubah rute `/request-account` agar langsung me-redirect ke `/login`.
4. **Penyelarasan Teks & Copywriting**:
   - Memperbarui deskripsi dialog pada `ContactAdminDialog.tsx` menjadi:
     > *"Pendaftaran akun baru diproses langsung oleh Admin"*

---

## Tasks Execution Summary

- [x] **Task 1: Buat Komponen Informasi Kontak Admin (`components/auth/ContactAdminDialog.tsx`)**
  - Implementasi modal dialog interaktif dengan `border-primary rounded-full`.
  - Tampilkan email resmi `admin@tarunagroup.co.id`, tombol salin email, dan tombol `mailto:`.
  - Deskripsi dialog disesuaikan: *"Pendaftaran akun baru diproses langsung oleh Admin"*.

- [x] **Task 2: Perbarui Halaman Login (`app/(auth)/login/page.tsx`)**
  - Hapus tautan link ke `/request-account`.
  - Tampilkan *"Belum punya akun? [Hubungi admin]"* dengan pemicu `ContactAdminDialog`.

- [x] **Task 3: Redirect Halaman `/request-account` Langsung ke `/login`**
  - Hapus komponen `AccountRequestInfoCard.tsx`.
  - Pasang `redirect("/login")` pada `app/(auth)/request-account/page.tsx`.

- [x] **Task 4: Audit Keamanan (`vibe-security`) & Verifikasi Teknis (`verification-before-completion`)**
  - Celah pendaftaran anonim di frontend tertutup sepenuhnya.
  - `npx tsc --noEmit` lolos dengan 0 error.
  - `npx eslint` lolos dengan 0 error / 0 warning pada seluruh file terkait.
