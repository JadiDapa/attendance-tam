import { notFound } from "next/navigation";
import LeaveDetailView from "@/components/leave/LeaveDetailView";
import { LeaveStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { LeaveService } from "@/servers/services/leave.service";

export default async function AdminIzinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);

  const { id } = await params;
  const leave = await LeaveService.getById(id);

  if (!leave) notFound();

  return (
    // Admin tidak lagi ikut approval izin/cuti/sakit — DONE dipakai sebagai
    // viewerStage supaya halaman ini selalu view-only (tidak akan pernah
    // cocok dengan pengajuan PENDING mana pun).
    <LeaveDetailView
      leave={leave}
      viewerStage={LeaveStage.DONE}
      backHref="/admin/izin"
      redirectTo="/admin/izin"
    />
  );
}
