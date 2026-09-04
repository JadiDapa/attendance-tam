"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { extractFaceEmbedding, FaceApiError } from "@/lib/face-recognition";
import { FaceService } from "@/servers/services/face.service";

export type FaceResult =
  | { ok: true; message: string; totalPhotos: number }
  | { ok: false; error: string };

export type FaceStatus = {
  enrolled: boolean;
  totalPhotos: number;
  minRequired: number;
};

/** Status enrollment wajah user yang sedang login — dipakai untuk menggerbang tombol absen. */
export async function getFaceEnrollmentStatus(): Promise<FaceStatus> {
  const user = await requireUser();
  const totalPhotos = await FaceService.countByUser(user.id);

  return {
    enrolled: totalPhotos >= FaceService.minEnrollmentPhotos,
    totalPhotos,
    minRequired: FaceService.minEnrollmentPhotos,
  };
}

/**
 * Tambah satu foto enrollment wajah. Dipanggil berkali-kali (3-5x) dari UI
 * enrollment di halaman profil, tiap panggilan menyimpan satu embedding baru
 * — tidak menimpa yang lama, supaya variasi pencahayaan/sudut makin banyak.
 */
export async function enrollFace(formData: FormData): Promise<FaceResult> {
  const user = await requireUser();

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, error: "Foto wajah wajib diambil" };
  }

  const currentTotal = await FaceService.countByUser(user.id);

  if (currentTotal >= FaceService.maxEnrollmentPhotos) {
    return {
      ok: false,
      error: `Maksimal ${FaceService.maxEnrollmentPhotos} foto wajah tersimpan. Hapus & daftar ulang kalau ingin mengganti.`,
    };
  }

  try {
    const embedding = await extractFaceEmbedding(photo);
    await FaceService.add(user.id, embedding.vector, embedding.model);
  } catch (error) {
    if (error instanceof FaceApiError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const totalPhotos = await FaceService.countByUser(user.id);

  revalidatePath("/profil");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      totalPhotos >= FaceService.minEnrollmentPhotos
        ? "Pendaftaran wajah selesai, kamu sudah bisa absen"
        : `Foto tersimpan (${totalPhotos}/${FaceService.minEnrollmentPhotos})`,
    totalPhotos,
  };
}

/** Hapus semua data wajah dan mulai enrollment dari awal. */
export async function resetFaceEnrollment(): Promise<FaceResult> {
  const user = await requireUser();

  await FaceService.deleteAllForUser(user.id);

  revalidatePath("/profil");
  revalidatePath("/dashboard");

  return { ok: true, message: "Data wajah dihapus, silakan daftar ulang", totalPhotos: 0 };
}
