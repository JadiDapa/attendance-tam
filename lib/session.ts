import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserService } from "@/servers/services/user.service";
import type { Role, User } from "@/generated/prisma";
import { defaultRouteForRole } from "@/lib/role";

/**
 * Data Access Layer untuk session. Clerk cuma menjamin identitas (siapa yang
 * login) — role & status aktif tetap sumber kebenarannya Prisma, jadi selalu
 * dicek ulang ke database supaya user yang dinonaktifkan/dihapus langsung
 * kehilangan akses meski sesi Clerk-nya masih valid.
 */

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId } = await auth();

  if (!userId) return null;

  const user = await UserService.getByClerkId(userId);

  if (!user || !user.isActive) return null;

  return user;
});

/**
 * Wajib login — kalau tidak, lempar ke halaman login. Kalau sesi Clerk valid
 * tapi user-nya tidak ada/dinonaktifkan di database, lempar ke halaman khusus
 * yang mencabut sesi Clerk-nya — bukan ke /login, supaya tidak loop redirect
 * (middleware selalu meloloskan sesi Clerk yang valid keluar dari /login).
 */
export async function requireUser(): Promise<User> {
  const { userId } = await auth();

  if (!userId) redirect("/login");

  const user = await getCurrentUser();

  if (!user) redirect("/account-disabled");

  return user;
}

/** Wajib login dengan role tertentu — kalau salah role, lempar ke dashboard-nya sendiri. */
export async function requireRole(role: Role): Promise<User> {
  const user = await requireUser();

  if (user.role !== role) redirect(defaultRouteForRole(user.role));

  return user;
}

/** Wajib login dengan salah satu dari beberapa role — kalau tidak cocok, lempar ke dashboard-nya sendiri. */
export async function requireAnyRole(roles: Role[]): Promise<User> {
  const user = await requireUser();

  if (!roles.includes(user.role)) redirect(defaultRouteForRole(user.role));

  return user;
}
