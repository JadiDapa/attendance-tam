import { notFound } from "next/navigation";
import OvertimeDetailView from "@/components/overtime/OvertimeDetailView";
import { OvertimeStage, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { OvertimeService } from "@/servers/services/overtime.service";

export default async function AdminLemburDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);

  const { id } = await params;
  const overtime = await OvertimeService.getById(id);

  if (!overtime) notFound();

  return (
    // Admin tidak lagi ikut approval lembur — DONE dipakai sebagai
    // viewerStage supaya halaman ini selalu view-only.
    <OvertimeDetailView
      overtime={overtime}
      viewerStage={OvertimeStage.DONE}
      backHref="/admin/lembur"
      redirectTo="/admin/lembur"
    />
  );
}
