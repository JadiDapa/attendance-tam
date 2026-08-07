import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

async function saveFile(
  file: File,
  allowed: Map<string, string>,
  typeError: string,
): Promise<string> {
  const ext = allowed.get(file.type);

  if (!ext) throw new Error(typeError);
  if (file.size > MAX_SIZE) throw new Error("Ukuran berkas melebihi 5MB");

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${crypto.randomUUID()}${ext}`;

  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return `/api/images/${filename}`;
}

/** Foto absensi — hanya gambar, karena selalu diambil langsung dari kamera. */
export function saveImage(file: File): Promise<string> {
  return saveFile(file, IMAGE_TYPES, "Format gambar tidak didukung");
}

/** Lampiran pengajuan izin — gambar atau PDF. */
export function saveAttachment(file: File): Promise<string> {
  return saveFile(
    file,
    ATTACHMENT_TYPES,
    "Format lampiran harus JPG, PNG, WEBP, atau PDF",
  );
}
