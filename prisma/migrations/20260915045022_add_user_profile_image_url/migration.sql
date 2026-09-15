-- Foto profil diisi otomatis dari pendaftaran wajah terbaru, menggantikan
-- stub avatar (lihat app/action/face.action.ts).
ALTER TABLE "User" ADD COLUMN "profileImageUrl" TEXT;
