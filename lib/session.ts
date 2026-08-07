import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserService } from "@/servers/services/user.service";
import type { Role, User } from "@/generated/prisma";
import { defaultRouteForRole } from "@/auth.config";

/**
 * Data Access Layer untuk session. Selalu dicek ulang ke database supaya user
 * yang dinonaktifkan/dihapus langsung kehilangan akses meski token masih valid.
 */

export const getSession = cache(async () => auth());

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();

  if (!session?.user?.id) return null;

  const user = await UserService.getById(session.user.id);

  if (!user || !user.isActive) return null;

  return user;
});

/** Wajib login — kalau tidak, lempar ke halaman login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return user;
}

/** Wajib login dengan role tertentu — kalau salah role, lempar ke dashboard-nya sendiri. */
export async function requireRole(role: Role): Promise<User> {
  const user = await requireUser();

  if (user.role !== role) redirect(defaultRouteForRole(user.role));

  return user;
}
