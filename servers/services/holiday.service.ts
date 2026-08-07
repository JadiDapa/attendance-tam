import prisma from "@/lib/prisma";
import { CreateHolidayDTO } from "../validators/holiday.validator";

export const HolidayService = {
  /** Semua hari libur, terbaru dulu — dipakai halaman pengaturan admin. */
  async list() {
    return prisma.holiday.findMany({ orderBy: { date: "desc" } });
  },

  /** Hari libur dalam satu rentang — dipakai rekap & laporan. */
  async listInRange(range: { startDate: Date; endDate: Date }) {
    return prisma.holiday.findMany({
      where: { date: { gte: range.startDate, lte: range.endDate } },
      orderBy: { date: "asc" },
    });
  },

  async getByDate(date: Date) {
    return prisma.holiday.findUnique({ where: { date } });
  },

  async create(data: CreateHolidayDTO) {
    return prisma.holiday.create({ data });
  },

  async update(id: string, data: CreateHolidayDTO) {
    return prisma.holiday.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.holiday.delete({ where: { id } });
  },
};
