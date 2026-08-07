import prisma from "@/lib/prisma";
import {
  OfficeLocationDTO,
  WorkDayDTO,
  WorkScheduleDTO,
} from "../validators/setting.validator";

/** Lokasi kantor aktif — MVP memakai satu lokasi saja. */
export const OfficeLocationService = {
  async getActive() {
    return prisma.officeLocation.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Perbarui lokasi aktif, atau buat kalau belum ada. */
  async save(data: OfficeLocationDTO) {
    const existing = await this.getActive();

    if (!existing) return prisma.officeLocation.create({ data });

    return prisma.officeLocation.update({ where: { id: existing.id }, data });
  },
};

/** Kebijakan waktu kerja aktif — MVP memakai satu jadwal untuk semua karyawan. */
export const WorkScheduleService = {
  async getActive() {
    return prisma.workSchedule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Simpan toleransi telat + jam kerja 7 hari sekaligus. */
  async save(data: WorkScheduleDTO) {
    const { days, ...policy } = data;
    const existing = await this.getActive();

    return prisma.$transaction([
      existing
        ? prisma.workSchedule.update({ where: { id: existing.id }, data: policy })
        : prisma.workSchedule.create({ data: policy }),
      ...days.map((day) => upsertWorkDay(day)),
    ]);
  },
};

function upsertWorkDay(day: WorkDayDTO) {
  const { dayOfWeek, ...rest } = day;

  return prisma.workDay.upsert({
    where: { dayOfWeek },
    update: rest,
    create: day,
  });
}

/** Jam kerja per hari — selalu 7 baris (0 = Minggu … 6 = Sabtu). */
export const WorkDayService = {
  async list() {
    return prisma.workDay.findMany({ orderBy: { dayOfWeek: "asc" } });
  },
};
