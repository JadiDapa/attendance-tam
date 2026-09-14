import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import {
  enrollFace,
  getFaceEnrollmentStatus,
  resetFaceEnrollment,
} from "@/app/action/face.action";

/** Status enrollment wajah sendiri — dipakai buat menggerbang tombol absen. */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const status = await getFaceEnrollmentStatus();

  return NextResponse.json(status);
}

/** Tambah satu foto enrollment wajah — multipart: photo. Dipanggil berkali-kali (3-5x). */
export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const formData = await request.formData();
  const result = await enrollFace(formData);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

/** Hapus semua data wajah dan mulai enrollment dari awal. */
export async function DELETE() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const result = await resetFaceEnrollment();

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
