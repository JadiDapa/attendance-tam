"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { extractFaceEmbedding, FaceApiError } from "@/lib/face-recognition";
import { FaceService } from "@/servers/services/face.service";
import { UserService } from "@/servers/services/user.service";
import { saveImage, deleteUpload } from "@/lib/storage";

export type FaceResult =
  | { ok: true; message: string; totalPhotos: number }
  | { ok: false; error: string };

export type FaceStatus = {
  enrolled: boolean;
  totalPhotos: number;
  minRequired: number;
  recommendedPhotos: number;
  maxPhotos: number;
};

/** Status enrollment wajah user yang sedang login — dipakai untuk menggerbang tombol absen. */
export async function getFaceEnrollmentStatus(): Promise<FaceStatus> {
  const user = await requireUser();
  const totalPhotos = await FaceService.countByUser(user.id);

  return {
    enrolled: totalPhotos >= FaceService.minEnrollmentPhotos,
    totalPhotos,
    minRequired: FaceService.minEnrollmentPhotos,
    recommendedPhotos: FaceService.recommendedEnrollmentPhotos,
    maxPhotos: FaceService.maxEnrollmentPhotos,
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

  // Foto enrollment pertama dipakai sebagai foto profil, menggantikan stub
  // avatar — hanya sekali, enrollment berikutnya tidak menimpanya. Best-effort,
  // kegagalan simpan gambar tidak boleh menggagalkan enrollment yang
  // embedding-nya sudah tersimpan di atas.
  if (currentTotal === 0 && !user.profileImageUrl) {
    try {
      const profileImageUrl = await saveImage(photo);

      await UserService.update(user.id, { profileImageUrl });
    } catch {
      // Diamkan — enrollment tetap sukses walau foto profil gagal diperbarui.
    }
  }

  const totalPhotos = await FaceService.countByUser(user.id);

  revalidatePath("/profil");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      totalPhotos < FaceService.minEnrollmentPhotos
        ? `Foto tersimpan (${totalPhotos}/${FaceService.minEnrollmentPhotos})`
        : totalPhotos < FaceService.recommendedEnrollmentPhotos
          ? `Pendaftaran wajah selesai, kamu sudah bisa absen. Disarankan menambah hingga ${FaceService.recommendedEnrollmentPhotos} foto untuk akurasi lebih baik.`
          : "Pendaftaran wajah selesai, kamu sudah bisa absen",
    totalPhotos,
  };
}

/** Hapus semua data wajah dan mulai enrollment dari awal. */
export async function resetFaceEnrollment(): Promise<FaceResult> {
  const user = await requireUser();

  await FaceService.deleteAllForUser(user.id);

  if (user.profileImageUrl) {
    await UserService.update(user.id, { profileImageUrl: null });
    await deleteUpload(user.profileImageUrl);
  }

  revalidatePath("/profil");
  revalidatePath("/dashboard");

  return { ok: true, message: "Data wajah dihapus, silakan daftar ulang", totalPhotos: 0 };
}
