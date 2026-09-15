"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { AccountRequestStatus, Prisma, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { ReviewAccountRequestSchema } from "@/servers/validators/account-request.validator";
import { AccountRequestService } from "@/servers/services/account-request.service";
import { UserService } from "@/servers/services/user.service";

export type AccountRequestResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const DUPLICATE_EMAIL = "Email sudah dipakai karyawan lain";
const GENERIC_CLERK_ERROR = "Gagal membuat akun, silakan coba lagi";

/**
 * Admin menyetujui atau menolak satu pengajuan akun dari /admin/permintaan-akun.
 * Menyetujui: dekripsi password yang ditulis pemohon, buat akun Clerk +
 * baris User (sama seperti `createEmployee` di user.action.ts), lalu tandai
 * request APPROVED. Menolak: tandai REJECTED saja — pemohon boleh
 * mengajukan lagi kapan pun, tidak ada pembatasan jumlah percobaan.
 */
export async function reviewAccountRequest(
  requestId: string,
  input: z.input<typeof ReviewAccountRequestSchema>,
): Promise<AccountRequestResult> {
  const admin = await requireRole(Role.ADMIN);

  const parsed = ReviewAccountRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { action, role, reviewNote } = parsed.data;

  const target = await AccountRequestService.getById(requestId);

  if (!target || target.status !== AccountRequestStatus.PENDING) {
    return { ok: false, error: "Pengajuan tidak ditemukan atau sudah diputuskan" };
  }

  if (action === "REJECT") {
    await AccountRequestService.markRejected(
      requestId,
      admin.id,
      reviewNote ? reviewNote : null,
    );

    revalidatePath("/admin/permintaan-akun");

    return { ok: true, message: `Pengajuan ${target.name} ditolak` };
  }

  if (!target.passwordEncrypted) {
    return { ok: false, error: "Password pengajuan tidak ditemukan" };
  }

  const password = decryptSecret(target.passwordEncrypted);
  const client = await clerkClient();

  let clerkUserId: string;

  try {
    const clerkUser = await client.users.createUser({
      emailAddress: [target.email],
      password,
      firstName: target.name,
    });
    clerkUserId = clerkUser.id;
  } catch {
    return { ok: false, error: GENERIC_CLERK_ERROR };
  }

  try {
    await UserService.create({
      clerkId: clerkUserId,
      name: target.name,
      email: target.email,
      role,
      phone: target.phone,
    });
  } catch (error) {
    // Rollback akun Clerk supaya tidak jadi akun yatim tanpa profil di database.
    await client.users.deleteUser(clerkUserId).catch(() => {});

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: DUPLICATE_EMAIL };
    }
    throw error;
  }

  await AccountRequestService.markApproved(requestId, admin.id);

  revalidatePath("/admin/permintaan-akun");
  revalidatePath("/admin/daftar-pekerja");

  return { ok: true, message: `Akun ${target.name} berhasil dibuat` };
}
