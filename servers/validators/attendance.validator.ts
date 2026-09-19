import { z } from "zod";
import { AttendanceApproval, AttendanceType, WorkMode } from "@/generated/prisma";

const DETAIL_MAX = 300;

/**
 * Payload dari form absensi (FormData → semua nilai berupa string, dan field
 * yang tidak dikirim jadi `null`).
 *
 * Absen masuk membawa lokasi; absen pulang cukup wajah saja — karyawan sering
 * sudah tidak berada di kantor saat pulang, jadi koordinatnya tidak diminta
 * dan tidak direkam.
 *
 * `workModeDetail` hanya relevan kalau absen masuknya di luar radius, dan itu
 * baru diketahui setelah jarak dihitung di server — jadi di sini opsional, dan
 * `submitAttendance` yang mewajibkannya. Tidak ada pilihan mode di sini:
 * absen di luar radius otomatis dicatat `LUAR_RADIUS`, karyawan tinggal
 * menuliskan alasannya.
 */
export const SubmitAttendanceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(AttendanceType.CHECK_IN),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    /** Akurasi GPS yang dilaporkan perangkat, dalam meter. */
    accuracy: z.coerce
      .number()
      .min(0, "Akurasi lokasi tidak valid")
      .max(100_000, "Akurasi lokasi tidak valid"),
    workModeDetail: z
      .string()
      .trim()
      .max(DETAIL_MAX, `Penjelasan maksimal ${DETAIL_MAX} karakter`)
      .nullish(),
  }),
  z.object({ type: z.literal(AttendanceType.CHECK_OUT) }),
]);

/** Data siap simpan setelah dihitung di server. */
export const CreateAttendanceSchema = z.object({
  type: z.enum(AttendanceType),
  userId: z.string().min(1),
  workDate: z.date(),
  /** Null untuk absen pulang — hanya wajah yang diverifikasi, lokasi tidak direkam. */
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  photoUrl: z.string().min(1),
  distanceMeters: z.number().nullable(),
  accuracyMeters: z.number().nullable(),
  /** Null untuk absen pulang — tidak ada lokasi yang dinilai. */
  isWithinRadius: z.boolean().nullable(),
  isLate: z.boolean(),
  // Menit terlambat tanpa toleransi — lihat `lateMinutesAt()`.
  lateMinutes: z.number().int().min(0),
  workMode: z.enum(WorkMode),
  /** Null untuk absensi di dalam radius — tidak ada yang perlu dijelaskan. */
  workModeDetail: z.string().nullable(),
  /** Null kalau absensinya di dalam radius dan tidak perlu persetujuan. */
  approvalStatus: z.enum(AttendanceApproval).nullable(),
});

/**
 * Keputusan admin atas absensi di luar radius. Saat menyetujui, admin memilih
 * mode finalnya — boleh sama dengan klaim karyawan, boleh menimpanya.
 */
export const ReviewAttendanceSchema = z
  .object({
    status: z.enum([AttendanceApproval.APPROVED, AttendanceApproval.REJECTED]),
    mode: z.enum(WorkMode).nullish(),
    reviewNote: z
      .string()
      .trim()
      .max(DETAIL_MAX, `Catatan maksimal ${DETAIL_MAX} karakter`)
      .nullish(),
  })
  .refine(
    (data) => data.status !== AttendanceApproval.APPROVED || Boolean(data.mode),
    {
      message: "Pilih mode kehadiran yang disetujui",
      path: ["mode"],
    },
  );

/**
 * Absensi yang dicatat admin secara manual (karyawan lupa absen, HP mati).
 * Tidak ada foto maupun GPS — penggantinya adalah jejak `isManual` + catatan.
 */
export const ManualAttendanceSchema = z.object({
  userId: z.string().min(1, "Pilih karyawan"),
  /** "YYYY-MM-DD" */
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  type: z.enum(AttendanceType),
  /** "HH:mm" pada zona APP_TIMEZONE. */
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Format jam harus HH:mm"),
  workMode: z.enum(WorkMode),
  reviewNote: z
    .string()
    .trim()
    .min(1, "Tulis alasan pencatatan manual")
    .max(DETAIL_MAX, `Alasan maksimal ${DETAIL_MAX} karakter`),
});

/**
 * Koreksi jam absensi yang sudah tercatat, oleh admin. Hanya jamnya yang
 * berubah (tanggal kerja tetap) — alasannya wajib sebagai jejak.
 */
export const UpdateAttendanceTimeSchema = z.object({
  /** "HH:mm" pada zona APP_TIMEZONE. */
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Format jam harus HH:mm"),
  editNote: z
    .string()
    .trim()
    .min(1, "Tulis alasan perubahan jam")
    .max(DETAIL_MAX, `Alasan maksimal ${DETAIL_MAX} karakter`),
});

/** Konfirmasi karyawan sendiri atas absen pulang yang terlewat. */
export const ConfirmMissedCheckoutSchema = z.object({
  /** "YYYY-MM-DD" */
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  /** "HH:mm" — kosong berarti otomatis pukul 17:00, karyawan tidak perlu memilih jam. */
  time: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Format jam harus HH:mm")
    .optional()
    .or(z.literal("")),
});

export type SubmitAttendanceDTO = z.infer<typeof SubmitAttendanceSchema>;
export type CreateAttendanceDTO = z.infer<typeof CreateAttendanceSchema>;
export type ReviewAttendanceDTO = z.output<typeof ReviewAttendanceSchema>;
export type ManualAttendanceDTO = z.output<typeof ManualAttendanceSchema>;
export type UpdateAttendanceTimeDTO = z.output<
  typeof UpdateAttendanceTimeSchema
>;
export type ConfirmMissedCheckoutDTO = z.infer<
  typeof ConfirmMissedCheckoutSchema
>;
