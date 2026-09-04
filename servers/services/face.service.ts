import prisma from "@/lib/prisma";

const MIN_ENROLLMENT_PHOTOS = Number(
  process.env.FACE_ENROLLMENT_MIN_PHOTOS ?? 3,
);

/**
 * Batas atas embedding tersimpan per karyawan. Tanpa ini, tombol "Tambah foto
 * lagi" bisa dipencet tanpa henti dan terus menambah baris — memperlambat
 * `/verify` (semua reference_vectors dikirim tiap absen) tanpa manfaat nyata
 * setelah variasi sudut/pencahayaan sudah cukup terekam.
 */
const MAX_ENROLLMENT_PHOTOS = Number(
  process.env.FACE_ENROLLMENT_MAX_PHOTOS ?? 10,
);

export const FaceService = {
  async listByUser(userId: string) {
    return prisma.faceEmbedding.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  async countByUser(userId: string) {
    return prisma.faceEmbedding.count({ where: { userId } });
  },

  /** Karyawan dianggap sudah enroll kalau embedding tersimpan >= batas minimum. */
  async isEnrolled(userId: string): Promise<boolean> {
    const count = await this.countByUser(userId);
    return count >= MIN_ENROLLMENT_PHOTOS;
  },

  async add(userId: string, vector: number[], model: string) {
    return prisma.faceEmbedding.create({
      data: { userId, vector, model },
    });
  },

  async deleteOne(id: string, userId: string) {
    // `userId` ikut jadi syarat where supaya satu karyawan tidak bisa hapus
    // embedding milik karyawan lain lewat ID yang ditebak.
    return prisma.faceEmbedding.deleteMany({ where: { id, userId } });
  },

  async deleteAllForUser(userId: string) {
    return prisma.faceEmbedding.deleteMany({ where: { userId } });
  },

  minEnrollmentPhotos: MIN_ENROLLMENT_PHOTOS,
  maxEnrollmentPhotos: MAX_ENROLLMENT_PHOTOS,
};
