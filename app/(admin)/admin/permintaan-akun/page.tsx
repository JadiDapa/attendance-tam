import { PersonIcon as UserPlus } from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import AccountRequestApprovalTable, {
  type AccountRequestRow,
} from "@/components/admin/AccountRequestApprovalTable";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatTime, formatWorkDate } from "@/lib/date";
import { AccountRequestService } from "@/servers/services/account-request.service";

export default async function PermintaanAkunPage() {
  await requireRole(Role.ADMIN);

  const pending = await AccountRequestService.listPending();

  const rows: AccountRequestRow[] = pending.map((request) => ({
    id: request.id,
    name: request.name,
    email: request.email,
    phone: request.phone,
    submittedLabel: `${formatWorkDate(request.createdAt)} ${formatTime(request.createdAt)}`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back
        title="Permintaan Akun"
        subtitle="Pengajuan pembuatan akun dari karyawan yang belum terdaftar lewat mobile app. Tinjau datanya, lalu setujui (akun Clerk langsung dibuat) atau tolak."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Menunggu Persetujuan"
          icon={UserPlus}
          value={String(pending.length)}
        />
      </div>

      <AccountRequestApprovalTable rows={rows} />
    </div>
  );
}
