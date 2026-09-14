import { z } from "zod";
import { EmploymentStatus, Gender, MaritalStatus, Religion } from "@/generated/prisma";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/** Nomor telepon — sama seperti pola di `user.validator.ts`/`profile.validator.ts`. */
const phoneField = z
  .string()
  .trim()
  .min(1, "Nomor telepon wajib diisi")
  .max(20, "Nomor telepon maksimal 20 karakter")
  .regex(/^[0-9+\-\s]*$/, "Nomor telepon hanya boleh angka");

/**
 * Data non-file untuk Identitas Pribadi. `ktpPhoto` (File) ditangani terpisah
 * di action karena endpoint ini butuh multipart.
 */
export const PersonalIdentitySchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  placeOfBirth: z.string().trim().min(1, "Tempat lahir wajib diisi").max(100),
  dateOfBirth: z
    .string()
    .regex(DATE_INPUT, "Tanggal lahir wajib diisi"),
  gender: z.enum(Gender),
  religion: z.enum(Religion),
  maritalStatus: z.enum(MaritalStatus),
  nationality: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : "Indonesia")),
});

export const ContactSchema = z.object({
  domicileAddress: z.string().trim().min(1, "Alamat domisili wajib diisi").max(500),
  ktpAddress: z.string().trim().min(1, "Alamat KTP wajib diisi").max(500),
  emergencyContactName: z.string().trim().min(1, "Nama kontak darurat wajib diisi").max(100),
  emergencyContactRelation: z
    .string()
    .trim()
    .min(1, "Hubungan keluarga wajib diisi")
    .max(60),
  emergencyContactPhone: phoneField,
});

export const EmploymentDataSchema = z
  .object({
    employeeNumber: z.string().trim().min(1, "Nomor induk pegawai wajib diisi").max(50),
    workLocation: z.string().trim().min(1, "Lokasi kerja wajib diisi").max(150),
    employmentStatus: z.enum(EmploymentStatus),
    startDate: z.string().regex(DATE_INPUT, "Tanggal masuk wajib diisi"),
    contractEndDate: z
      .string()
      .regex(DATE_INPUT, "Format tanggal berakhir kontrak tidak valid")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) =>
      data.employmentStatus !== EmploymentStatus.PKWT || !!data.contractEndDate,
    {
      message: "Tanggal berakhir kontrak wajib diisi untuk status PKWT",
      path: ["contractEndDate"],
    },
  );

export const WorkHistorySchema = z.object({
  previousCompany: z.string().trim().max(150).optional().or(z.literal("")),
  previousPosition: z.string().trim().max(100).optional().or(z.literal("")),
  previousDuration: z.string().trim().max(60).optional().or(z.literal("")),
});

export const TrainingSchema = z.object({
  trainingHistory: z
    .string()
    .trim()
    .max(2000, "Riwayat training maksimal 2000 karakter")
    .optional()
    .or(z.literal("")),
});

/** ADMIN-only — karyawan tidak punya jalur mutasi apa pun untuk Payroll. */
export const PayrollSchema = z.object({
  baseSalary: z.coerce.number().int().positive("Gaji pokok wajib diisi"),
  allowance: z.coerce.number().int().nonnegative().optional(),
  bonus: z.coerce.number().int().nonnegative().optional(),
  bankAccountNumber: z.string().trim().min(1, "Nomor rekening wajib diisi").max(50),
  bankAccountName: z.string().trim().min(1, "Nama pemilik rekening wajib diisi").max(100),
  bpjsKesehatanNumber: z.string().trim().max(30).optional().or(z.literal("")),
  bpjsKetenagakerjaanNumber: z.string().trim().max(30).optional().or(z.literal("")),
});

export type PersonalIdentityInput = z.input<typeof PersonalIdentitySchema>;
export type PersonalIdentityDTO = z.output<typeof PersonalIdentitySchema>;
export type ContactInput = z.input<typeof ContactSchema>;
export type ContactDTO = z.output<typeof ContactSchema>;
export type EmploymentDataInput = z.input<typeof EmploymentDataSchema>;
export type EmploymentDataDTO = z.output<typeof EmploymentDataSchema>;
export type WorkHistoryInput = z.input<typeof WorkHistorySchema>;
export type WorkHistoryDTO = z.output<typeof WorkHistorySchema>;
export type TrainingInput = z.input<typeof TrainingSchema>;
export type TrainingDTO = z.output<typeof TrainingSchema>;
export type PayrollInput = z.input<typeof PayrollSchema>;
export type PayrollDTO = z.output<typeof PayrollSchema>;
