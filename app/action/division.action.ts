"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import {
  CreateDivisionSchema,
  UpdateDivisionSchema,
  CreatePositionSchema,
  UpdatePositionSchema,
} from "@/servers/validators/division.validator";
import { DivisionService } from "@/servers/services/division.service";

export type ActionResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string };

const REVALIDATE_PATHS = [
  "/admin/divisi-jabatan",
  "/admin/daftar-pekerja",
  "/admin/daftar-pekerja/tambah",
];

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function createDivision(
  input: z.input<typeof CreateDivisionSchema>,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = CreateDivisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data divisi tidak valid",
    };
  }

  try {
    const created = await DivisionService.create(parsed.data);
    revalidateAll();
    return { ok: true, message: `Divisi '${created.name}' berhasil dibuat`, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Nama divisi sudah digunakan" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal membuat divisi",
    };
  }
}

export async function updateDivision(
  id: string,
  input: z.input<typeof UpdateDivisionSchema>,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = UpdateDivisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data divisi tidak valid",
    };
  }

  try {
    const updated = await DivisionService.update(id, parsed.data);
    revalidateAll();
    return { ok: true, message: `Divisi berhasil diubah menjadi '${updated.name}'` };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Nama divisi sudah digunakan" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui divisi",
    };
  }
}

export async function deleteDivision(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  try {
    const deleted = await DivisionService.delete(id);
    revalidateAll();
    return { ok: true, message: `Divisi '${deleted.name}' berhasil dihapus` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus divisi",
    };
  }
}

// --- POSITION ACTIONS ---

export async function createPosition(
  input: z.input<typeof CreatePositionSchema>,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = CreatePositionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data jabatan tidak valid",
    };
  }

  try {
    const created = await DivisionService.createPosition(parsed.data);
    revalidateAll();
    return { ok: true, message: `Jabatan '${created.name}' berhasil ditambahkan`, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Nama jabatan sudah ada dalam divisi tersebut" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menambahkan jabatan",
    };
  }
}

export async function updatePosition(
  id: string,
  input: z.input<typeof UpdatePositionSchema>,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = UpdatePositionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data jabatan tidak valid",
    };
  }

  try {
    const updated = await DivisionService.updatePosition(id, parsed.data);
    revalidateAll();
    return { ok: true, message: `Jabatan berhasil diubah menjadi '${updated.name}'` };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Nama jabatan sudah ada dalam divisi tersebut" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui jabatan",
    };
  }
}

export async function deletePosition(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  try {
    const deleted = await DivisionService.deletePosition(id);
    revalidateAll();
    return { ok: true, message: `Jabatan '${deleted.name}' berhasil dihapus` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus jabatan",
    };
  }
}

