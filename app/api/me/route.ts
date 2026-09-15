import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { updateProfile } from "@/app/action/profile.action";

/** Profil user yang sedang login — dipakai mobile app buat tampilan Profil. */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const {
    id,
    name,
    email,
    role,
    phone,
    position,
    profileImageUrl,
    isActive,
    createdAt,
  } = auth.user;

  return NextResponse.json({
    id,
    name,
    email,
    role,
    phone,
    position,
    profileImageUrl,
    isActive,
    createdAt,
  });
}

/** Update profil sendiri (saat ini cuma nomor HP — lihat UpdateProfileSchema). */
export async function PATCH(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const result = await updateProfile(body);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
