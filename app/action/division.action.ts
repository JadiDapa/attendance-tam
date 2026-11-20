"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  AssignPositionSchema,
  DivisionFormSchema,
  PositionFormSchema,
  RenamePositionSchema,
} from "@/servers/validators/division.validator";
import { DivisionService } from "@/servers/services/division.service";
import { UserService } from "@/servers/services/user.service";

export type DivisionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const fail = (error: string): DivisionResult => ({ ok: false, error });

const DIVISION_GONE = "Divisi sudah dihapus";
const POSITION_GONE = "Jabatan sudah dihapus";
const duplicateDivision = (name: string) => `Divisi ${name} sudah ada`;
const duplicatePosition = (name: string) =>
  `Jabatan ${name} sudah ada di Divisi ini`;

/** Halaman yang menampilkan struktur atau nama Jabatan seseorang. */
function revalidateDivisionPages() {
  revalidatePath("/admin/divisi");
  revalidatePath("/admin/daftar-pekerja", "layout");
  revalidatePath("/admin/rekapan-kehadiran");
  revalidatePath("/profil");
}

/**
 * Terjemahkan error Prisma yang bisa diduga jadi pesan untuk admin; selain
 * itu dilempar ulang. Hanya kode yang diberi pesan yang ditangkap.
 */
function knownError(
  error: unknown,
  messages: {
    /** P2002 — nama sudah dipakai. */
    duplicate?: string;
    /** P2025 — baris yang diubah/dihapus sudah tidak ada. */
    missing?: string;
    /**
     * P2003 — pelanggaran foreign key: baris masih dipakai (hapus), atau baris
     * rujukan baru saja dihapus (buat/pindah). Jaring pengaman kalau ada
     * perubahan bersamaan sesudah pengecekan di service.
     */
    foreignKey?: string;
  },
): DivisionResult {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
  const message =
    code === "P2002"
      ? messages.duplicate
      : code === "P2025"
        ? messages.missing
        : code === "P2003"
          ? messages.foreignKey
          : undefined;

  if (message) return fail(message);
  throw error;
}

function firstIssue(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

export async function createDivision(
  input: z.input<typeof DivisionFormSchema>,
): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const parsed = DivisionFormSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error, "Data Divisi tidak valid"));

  try {
    await DivisionService.createDivision(parsed.data);
  } catch (error) {
    return knownError(error, { duplicate: duplicateDivision(parsed.data.name) });
  }

  revalidateDivisionPages();
  return { ok: true, message: `Divisi ${parsed.data.name} ditambahkan` };
}

export async function renameDivision(
  divisionId: string,
  input: z.input<typeof DivisionFormSchema>,
): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const parsed = DivisionFormSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error, "Data Divisi tidak valid"));

  try {
    await DivisionService.renameDivision(divisionId, parsed.data);
  } catch (error) {
    return knownError(error, {
      duplicate: duplicateDivision(parsed.data.name),
      missing: DIVISION_GONE,
    });
  }

  revalidateDivisionPages();
  return { ok: true, message: `Nama Divisi diubah menjadi ${parsed.data.name}` };
}

export async function deleteDivision(divisionId: string): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const stillHasPositions = (count?: number) =>
    `Divisi masih punya ${count ?? "beberapa"} Jabatan. Hapus Jabatannya terlebih dahulu.`;

  try {
    const outcome = await DivisionService.deleteDivision(divisionId);
    if (!outcome.deleted) return fail(stillHasPositions(outcome.blockers));
  } catch (error) {
    return knownError(error, {
      missing: DIVISION_GONE,
      foreignKey: stillHasPositions(),
    });
  }

  revalidateDivisionPages();
  return { ok: true, message: "Divisi dihapus" };
}

export async function createPosition(
  input: z.input<typeof PositionFormSchema>,
): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const parsed = PositionFormSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error, "Data Jabatan tidak valid"));

  try {
    await DivisionService.createPosition(parsed.data);
  } catch (error) {
    return knownError(error, {
      duplicate: duplicatePosition(parsed.data.name),
      foreignKey: DIVISION_GONE,
    });
  }

  revalidateDivisionPages();
  return { ok: true, message: `Jabatan ${parsed.data.name} ditambahkan` };
}

export async function renamePosition(
  positionId: string,
  input: z.input<typeof RenamePositionSchema>,
): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const parsed = RenamePositionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error, "Data Jabatan tidak valid"));

  try {
    await DivisionService.renamePosition(positionId, parsed.data);
  } catch (error) {
    return knownError(error, {
      duplicate: duplicatePosition(parsed.data.name),
      missing: POSITION_GONE,
    });
  }

  revalidateDivisionPages();
  return {
    ok: true,
    message: `Nama Jabatan diubah menjadi ${parsed.data.name}, termasuk di profil pemegangnya`,
  };
}

export async function deletePosition(positionId: string): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const stillHeld = (count?: number) =>
    `Jabatan masih dipegang ${count ?? "seseorang"}${count ? " orang" : ""} (termasuk akun nonaktif). Pindahkan pemegangnya terlebih dahulu.`;

  try {
    const outcome = await DivisionService.deletePosition(positionId);
    if (!outcome.deleted) return fail(stillHeld(outcome.blockers));
  } catch (error) {
    return knownError(error, { missing: POSITION_GONE, foreignKey: stillHeld() });
  }

  revalidateDivisionPages();
  return { ok: true, message: "Jabatan dihapus" };
}

/** Pindah Jabatan langsung oleh Admin (tanpa approval); null = kosongkan. */
export async function assignUserPosition(
  input: z.input<typeof AssignPositionSchema>,
): Promise<DivisionResult> {
  await requireRole(Role.ADMIN);

  const parsed = AssignPositionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error, "Data tidak valid"));

  const target = await UserService.getById(parsed.data.userId);
  if (!target) return fail("Pekerja tidak ditemukan");

  // Manager berada di atas semua Divisi, tanpa Jabatan maupun Divisi (ADR 0001).
  if (parsed.data.positionId !== null && target.role === Role.MANAGER) {
    return fail("Manager tidak punya Jabatan maupun Divisi");
  }

  try {
    await DivisionService.assignPosition(parsed.data);
  } catch (error) {
    return knownError(error, {
      missing: parsed.data.positionId ? POSITION_GONE : "Pekerja tidak ditemukan",
      foreignKey: POSITION_GONE,
    });
  }

  revalidateDivisionPages();
  return {
    ok: true,
    message: parsed.data.positionId ? "Jabatan diperbarui" : "Jabatan dikosongkan",
  };
}
