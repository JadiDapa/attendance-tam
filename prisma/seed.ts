import { HolidayType, PrismaClient, Role } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@tam.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const EMPLOYEE_EMAIL = process.env.SEED_EMPLOYEE_EMAIL ?? "karyawan@tam.test";
const EMPLOYEE_PASSWORD = process.env.SEED_EMPLOYEE_PASSWORD ?? "karyawan123";

/**
 * Libur nasional 2026 sebagai titik awal — BUKAN sumber resmi.
 *
 * Tanggal yang mengikuti kalender Hijriah, Imlek, Saka, dan Paskah bergeser
 * tiap tahun dan baru pasti setelah SKB 3 Menteri terbit, begitu juga cuti
 * bersama yang sengaja tidak diisi di sini. Cocokkan dengan SKB yang berlaku
 * lalu perbaiki lewat menu Admin > Hari Libur.
 *
 * Seed ini tidak pernah menimpa data yang sudah ada (upsert `update: {}`),
 * jadi koreksi admin aman walau seed dijalankan ulang.
 */
const HOLIDAYS_2026: { date: string; name: string; type: HolidayType }[] = [
  { date: "2026-01-01", name: "Tahun Baru Masehi", type: HolidayType.NASIONAL },
  { date: "2026-01-16", name: "Isra Mikraj Nabi Muhammad SAW", type: HolidayType.NASIONAL },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577", type: HolidayType.NASIONAL },
  { date: "2026-03-19", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)", type: HolidayType.NASIONAL },
  { date: "2026-03-20", name: "Hari Raya Idul Fitri 1447 H", type: HolidayType.NASIONAL },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H", type: HolidayType.NASIONAL },
  { date: "2026-04-03", name: "Wafat Isa Almasih", type: HolidayType.NASIONAL },
  { date: "2026-05-01", name: "Hari Buruh Internasional", type: HolidayType.NASIONAL },
  { date: "2026-05-14", name: "Kenaikan Isa Almasih", type: HolidayType.NASIONAL },
  { date: "2026-05-27", name: "Hari Raya Idul Adha 1447 H", type: HolidayType.NASIONAL },
  { date: "2026-05-31", name: "Hari Raya Waisak 2570", type: HolidayType.NASIONAL },
  { date: "2026-06-01", name: "Hari Lahir Pancasila", type: HolidayType.NASIONAL },
  { date: "2026-06-16", name: "Tahun Baru Islam 1448 H", type: HolidayType.NASIONAL },
  { date: "2026-08-17", name: "Hari Kemerdekaan Republik Indonesia", type: HolidayType.NASIONAL },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW", type: HolidayType.NASIONAL },
  { date: "2026-12-25", name: "Hari Raya Natal", type: HolidayType.NASIONAL },
];

export async function main() {
  console.log("Seeding database...");

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: "Administrator",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: Role.ADMIN,
      phone: "081200000000",
      position: "HR Admin",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: EMPLOYEE_EMAIL },
    update: {},
    create: {
      name: "Karyawan Contoh",
      email: EMPLOYEE_EMAIL,
      passwordHash: await bcrypt.hash(EMPLOYEE_PASSWORD, 10),
      role: Role.EMPLOYEE,
      phone: "081211112222",
      position: "Staff",
    },
  });

  // Lokasi kantor contoh — Monas, Jakarta. Ganti lewat menu admin.
  const office = await prisma.officeLocation.findFirst({
    where: { name: "Kantor Pusat" },
  });

  if (!office) {
    await prisma.officeLocation.create({
      data: {
        name: "Kantor Pusat",
        latitude: -6.1753924,
        longitude: 106.8271528,
        radiusMeters: 100,
      },
    });
  }

  const schedule = await prisma.workSchedule.findFirst({
    where: { isActive: true },
  });

  if (!schedule) {
    await prisma.workSchedule.create({
      data: {
        name: "Jam Kerja Standar",
        lateToleranceMinutes: 15,
      },
    });
  }

  // Selalu 7 baris: Senin–Jumat kerja, Sabtu & Minggu libur. Ganti lewat
  // menu admin > Waktu Kerja.
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    await prisma.workDay.upsert({
      where: { dayOfWeek },
      update: {},
      create: {
        dayOfWeek,
        isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
        checkInTime: "08:00",
        checkOutTime: "17:00",
      },
    });
  }

  for (const holiday of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date: new Date(`${holiday.date}T00:00:00.000Z`) },
      update: {},
      create: {
        date: new Date(`${holiday.date}T00:00:00.000Z`),
        name: holiday.name,
        type: holiday.type,
      },
    });
  }

  console.log("Database seeded successfully.");
  console.log(`  admin    : ${admin.email} / ${ADMIN_PASSWORD}`);
  console.log(`  employee : ${employee.email} / ${EMPLOYEE_PASSWORD}`);
  console.log(
    `  libur    : ${HOLIDAYS_2026.length} tanggal 2026 — cocokkan dengan SKB 3 Menteri lewat menu Hari Libur`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
