import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import type { Role, User } from "@/generated/prisma";

/**
 * Versi `requireUser`/`requireRole` (lib/session.ts) untuk route handler API:
 * balas JSON 401/403, bukan `redirect()` — client REST (mobile) butuh status
 * code yang jelas, bukan response redirect ke halaman login.
 */
export type ApiAuthResult =
  | { user: User; response?: undefined }
  | { user: null; response: NextResponse };

export async function requireApiUser(): Promise<ApiAuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user };
}

export async function requireApiRole(role: Role): Promise<ApiAuthResult> {
  const result = await requireApiUser();

  if (!result.user) return result;

  if (result.user.role !== role) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

/** Sama seperti `requireApiRole`, tapi menerima salah satu dari beberapa role. */
export async function requireApiAnyRole(roles: Role[]): Promise<ApiAuthResult> {
  const result = await requireApiUser();

  if (!result.user) return result;

  if (!roles.includes(result.user.role)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}
