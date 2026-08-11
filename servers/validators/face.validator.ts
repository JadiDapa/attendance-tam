import { z } from "zod";

/**
 * Payload embedding yang dikembalikan FastAPI setelah memproses satu foto.
 * `vector` panjangnya tergantung model (ArcFace = 512 angka) — tidak dibatasi
 * di sini karena itu detail milik layanan face recognition, bukan Next.js.
 */
export const FaceEmbeddingSchema = z.object({
  vector: z.array(z.number()).min(1, "Embedding tidak valid"),
  model: z.string().min(1),
});

/** Respons FastAPI untuk endpoint ekstraksi embedding (dipakai saat enroll). */
export const ExtractEmbeddingResponseSchema = z.object({
  status: z.literal("ok"),
  embedding: FaceEmbeddingSchema,
});

/** Respons FastAPI untuk endpoint verifikasi 1:1 (dipakai saat absen). */
export const VerifyFaceResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("match"),
    distance: z.number(),
  }),
  z.object({
    status: z.literal("no_match"),
    distance: z.number().nullable(),
  }),
]);

/** Error terstruktur yang dikembalikan FastAPI (mis. wajah tidak terdeteksi). */
export const FaceApiErrorSchema = z.object({
  detail: z.string(),
});

export type ExtractEmbeddingResponse = z.infer<
  typeof ExtractEmbeddingResponseSchema
>;
export type VerifyFaceResponse = z.infer<typeof VerifyFaceResponseSchema>;
