import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import {
  AdministrativeDocumentService,
  ContactService,
  EmploymentDataService,
  PayrollService,
  PersonalIdentityService,
  TrainingService,
  WorkHistoryService,
} from "@/servers/services/employee-profile.service";

/**
 * Semua tujuh bagian profil karyawan yang sedang login sekaligus — dipakai
 * mobile app buat tampilan Profil. Setiap bagian `null` kalau belum pernah
 * diisi (belum ada baris), bukan error.
 */
export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) return auth.response;

  const userId = auth.user.id;

  const [
    personalIdentity,
    contact,
    employmentData,
    workHistory,
    administrativeDocument,
    payroll,
    training,
  ] = await Promise.all([
    PersonalIdentityService.getByUserId(userId),
    ContactService.getByUserId(userId),
    EmploymentDataService.getByUserId(userId),
    WorkHistoryService.getByUserId(userId),
    AdministrativeDocumentService.getByUserId(userId),
    PayrollService.getByUserId(userId),
    TrainingService.getByUserId(userId),
  ]);

  return NextResponse.json({
    personalIdentity,
    contact,
    employmentData,
    workHistory,
    administrativeDocument,
    payroll,
    training,
  });
}
