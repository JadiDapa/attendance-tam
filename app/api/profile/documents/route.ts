import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { upsertAdministrativeDocuments } from "@/app/action/employee-profile.action";

/**
 * Simpan dokumen administrasi sendiri — multipart, satu (atau beberapa) dari
 * field ktp/npwp/kk/ijazah/transkrip/sertifikat/bankBook/pasFoto/cv, supaya
 * tetap di bawah batas ukuran body. Upload satu dokumen per request.
 */
export async function PUT(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const formData = await request.formData();

  formData.delete("targetUserId");

  const result = await upsertAdministrativeDocuments(formData);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
