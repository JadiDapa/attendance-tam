import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "uploads/images");

const IMAGE_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

/** Lampiran pengajuan boleh PDF juga — surat dokter sering berupa PDF. */
const ATTACHMENT_TYPES = new Map([...IMAGE_TYPES, ["application/pdf", ".pdf"]]);

/**
 * Batas ini harus selaras dengan `serverActions.bodySizeLimit` di
 * `next.config.ts` — kalau lebih besar, Next.js menolak duluan dengan error
 * mentah sebelum pesan yang ramah di sini sempat muncul.
 */
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Turunkan resolusi + kualitas gambar sebelum ditulis ke disk, supaya foto
 * absensi & lampiran pengajuan (yang jumlahnya terus bertambah tiap hari)
 * tidak menghabiskan storage. Sengaja TIDAK dipakai untuk dokumen
 * administrasi/KTP dkk — itu dokumen legal yang harus tetap terbaca penuh.
 * Gagal kompres (mis. file gambar korup) jatuh balik ke buffer asli, bukan
 * menggagalkan upload.
 */
async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    const image = sharp(buffer).rotate().resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    });

    switch (mimeType) {
      case "image/png":
        return await image.png({ quality: 75, compressionLevel: 9 }).toBuffer();
      case "image/webp":
        return await image.webp({ quality: 75 }).toBuffer();
      default:
        return await image.jpeg({ quality: 75, mozjpeg: true }).toBuffer();
    }
  } catch {
    return buffer;
  }
}

async function saveFile(
  file: File,
  allowed: Map<string, string>,
  typeError: string,
  compress: boolean,
): Promise<string> {
  const ext = allowed.get(file.type);

  if (!ext) throw new Error(typeError);
  if (file.size > MAX_SIZE) throw new Error("Ukuran berkas melebihi 5MB");

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${crypto.randomUUID()}${ext}`;
  let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());

  if (compress && IMAGE_TYPES.has(file.type)) {
    buffer = await compressImage(buffer, file.type);
  }

  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/api/images/${filename}`;
}

/** Foto absensi — hanya gambar, karena selalu diambil langsung dari kamera. Dikompres. */
export function saveImage(file: File): Promise<string> {
  return saveFile(file, IMAGE_TYPES, "Format gambar tidak didukung", true);
}

/**
 * Lampiran pengajuan izin/dinas luar — gambar atau PDF.
 * `compress` default false supaya dokumen administrasi (KTP, ijazah, dst. —
 * lihat `employee-profile.action.ts`) tetap disimpan apa adanya; pemanggil
 * lampiran pengajuan (`leave.action.ts`, `field-assignment.action.ts`)
 * mengaktifkannya secara eksplisit.
 */
export function saveAttachment(
  file: File,
  { compress = false }: { compress?: boolean } = {},
): Promise<string> {
  return saveFile(
    file,
    ATTACHMENT_TYPES,
    "Format lampiran harus JPG, PNG, WEBP, atau PDF",
    compress,
  );
}

/**
 * Hapus berkas yang sudah disimpan `saveImage`/`saveAttachment`, mis. karena
 * baris DB yang mestinya memakainya gagal dibuat. Diam-diam kalau berkasnya
 * sudah tidak ada — dipanggil sebagai best-effort cleanup, bukan langkah yang
 * boleh menggagalkan alur utama.
 */
export async function deleteUpload(url: string): Promise<void> {
  const filename = path.basename(url);

  if (!filename) return;

  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // Sudah terhapus atau tidak pernah ada — tidak masalah.
  }
}
