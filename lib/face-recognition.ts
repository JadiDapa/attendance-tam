import "server-only";
import {
  ExtractEmbeddingResponseSchema,
  FaceApiErrorSchema,
  VerifyFaceResponseSchema,
  type ExtractEmbeddingResponse,
  type VerifyFaceResponse,
} from "@/servers/validators/face.validator";

/**
 * Klien untuk layanan face recognition (FastAPI + DeepFace).
 *
 * PENTING: modul ini hanya boleh dipanggil dari server (server action / route
 * handler), tidak pernah dari client component — `import "server-only"` di
 * atas memastikan build gagal kalau ada yang salah import ini ke bundle client.
 *
 * FastAPI-nya sendiri idealnya jalan di internal network (tidak exposed ke
 * internet). `FACE_API_SECRET` adalah lapis kedua jaga-jaga kalau suatu saat
 * network config berubah/salah setting.
 */

const FACE_API_URL = process.env.FACE_API_URL;
const FACE_API_SECRET = process.env.FACE_API_SECRET;
const REQUEST_TIMEOUT_MS = 30_000;

export class FaceApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_CONFIGURED"
      | "NO_FACE_DETECTED"
      | "TIMEOUT"
      | "UNREACHABLE"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "FaceApiError";
  }
}

function requireConfig(): { url: string; secret: string } {
  if (!FACE_API_URL || !FACE_API_SECRET) {
    throw new FaceApiError(
      "Layanan face recognition belum dikonfigurasi (FACE_API_URL/FACE_API_SECRET kosong)",
      "NOT_CONFIGURED",
    );
  }
  return { url: FACE_API_URL, secret: FACE_API_SECRET };
}

async function callFaceApi(path: string, body: FormData): Promise<Response> {
  const { url, secret } = requireConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${url}${path}`, {
      method: "POST",
      headers: { "X-Internal-Secret": secret },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new FaceApiError(
        "Layanan face recognition tidak merespons",
        "TIMEOUT",
      );
    }
    throw new FaceApiError(
      "Tidak bisa menghubungi layanan face recognition",
      "UNREACHABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function handleErrorResponse(res: Response): Promise<never> {
  const raw = await res.json().catch(() => null);
  const parsed = FaceApiErrorSchema.safeParse(raw);
  const detail = parsed.success ? parsed.data.detail : "Gagal memproses wajah";

  // FastAPI di kode contoh sebelumnya balikin 400 khusus untuk "wajah tidak
  // terdeteksi" — dibedakan di sini supaya pesan ke karyawan lebih jelas.
  if (res.status === 400) {
    throw new FaceApiError(detail, "NO_FACE_DETECTED");
  }

  throw new FaceApiError(detail, "UNKNOWN");
}

/**
 * Ekstrak embedding dari satu foto wajah. Dipakai saat enrollment — hasilnya
 * disimpan ke tabel `FaceEmbedding` lewat Prisma, FastAPI sendiri tidak
 * menyimpan apa-apa (stateless, sesuai arsitektur Opsi A yang disepakati).
 */
export async function extractFaceEmbedding(
  photo: File,
): Promise<ExtractEmbeddingResponse["embedding"]> {
  const formData = new FormData();
  formData.set("photo", photo);

  const res = await callFaceApi("/embed", formData);

  if (!res.ok) await handleErrorResponse(res);

  const raw = await res.json();
  const parsed = ExtractEmbeddingResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new FaceApiError(
      "Respons layanan face recognition tidak sesuai format",
      "UNKNOWN",
    );
  }

  return parsed.data.embedding;
}

/**
 * Verifikasi 1:1 — cocokkan foto absensi dengan embedding milik SATU
 * karyawan (yang sedang login), bukan seluruh karyawan. `referenceVectors`
 * diambil dari Prisma (`FaceEmbedding` milik user itu) lalu dikirim ke
 * FastAPI untuk dihitung jaraknya di sana.
 */
export async function verifyFace(
  photo: File,
  referenceVectors: number[][],
): Promise<VerifyFaceResponse> {
  const formData = new FormData();
  formData.set("photo", photo);
  formData.set("reference_vectors", JSON.stringify(referenceVectors));

  const res = await callFaceApi("/verify", formData);

  if (!res.ok) await handleErrorResponse(res);

  const raw = await res.json();
  const parsed = VerifyFaceResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new FaceApiError(
      "Respons layanan face recognition tidak sesuai format",
      "UNKNOWN",
    );
  }

  return parsed.data;
}
