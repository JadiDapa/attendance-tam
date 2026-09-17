import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { updateProfileImage } from "@/app/action/profile.action";

/** Ganti foto profil sendiri — multipart, field `photo`, dipilih manual dari galeri/berkas. */
export async function PUT(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const formData = await request.formData();

  const result = await updateProfileImage(formData);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
