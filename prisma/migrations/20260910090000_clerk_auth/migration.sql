-- Auth pindah ke Clerk: identitas & password sudah dikelola Clerk, User Prisma
-- cuma menyimpan profil/role aplikasi lewat clerkId.

-- 1. Tambah kolom nullable dulu supaya baris lama tidak langsung gagal.
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

-- 2. Isi placeholder unik untuk baris yang sudah ada (migrasi dari NextAuth).
--    GANTI nilai ini dengan Clerk user id asli begitu akun Clerk-nya dibuat —
--    lihat kolom email untuk mencocokkan baris mana yang mana.
UPDATE "User" SET "clerkId" = 'user_placeholder_' || "id" WHERE "clerkId" IS NULL;

-- 3. Wajibkan & jadikan unik setelah semua baris terisi.
ALTER TABLE "User" ALTER COLUMN "clerkId" SET NOT NULL;
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- 4. Password tidak lagi disimpan di sini.
ALTER TABLE "User" DROP COLUMN "passwordHash";
