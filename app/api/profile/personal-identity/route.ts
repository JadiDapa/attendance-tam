import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { upsertPersonalIdentity } from "@/app/action/employee-profile.action";

/** Simpan identitas pribadi sendiri — multipart: nik, placeOfBirth, dateOfBirth, gender, religion, maritalStatus, nationality?, ktpPhoto?. */
export async function PUT(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const formData = await request.formData();

  // Mobile hanya boleh mengedit datanya sendiri — targetUserId tidak dipakai.
  formData.delete("targetUserId");

  const result = await upsertPersonalIdentity(formData);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
