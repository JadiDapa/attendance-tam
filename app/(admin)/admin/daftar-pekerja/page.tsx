import Link from "next/link";
import {
  PlusIcon as Plus,
  IdCardIcon as UserCheck,
  AvatarIcon as Users,
  PieChartIcon as PieChart,
  UploadIcon as Upload,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import WorkerRoleChart from "@/components/dashboard/WorkerRoleChart";
import WorkerStatusChart from "@/components/dashboard/WorkerStatusChart";
import WorkerTable, {
  type WorkerRow,
} from "@/components/admin/WorkerTable";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate } from "@/lib/date";
import { UserService } from "@/servers/services/user.service";

export default async function DaftarPekerjaPage() {
  await requireRole(Role.ADMIN);

  const users = await UserService.list();

  const rows: WorkerRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? "",
    position: user.position ?? "",
    isActive: user.isActive,
    joinedAt: formatWorkDate(getWorkDate(user.createdAt)),
  }));

  const activeCount = rows.filter((row) => row.isActive).length;
  const inactiveCount = rows.length - activeCount;

  const countByRole = rows.reduce(
    (acc, row) => {
      acc[row.role] += 1;
      return acc;
    },
    { EMPLOYEE: 0, ADMIN: 0, SUPERVISOR: 0, MANAGER: 0 } as Record<
      Role,
      number
    >,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Daftar Pekerja"
        subtitle={`${activeCount} aktif dari ${rows.length} akun`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/daftar-pekerja/impor">
                <Upload className="size-4" />
                Impor CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/daftar-pekerja/baru">
                <Plus className="size-4" />
                Buat Akun Baru
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Total Akun"
          icon={Users}
          value={String(rows.length)}
          footerLabel={`${activeCount} aktif · ${inactiveCount} nonaktif`}
        />
        <StatTile
          label="Akun Aktif"
          icon={UserCheck}
          value={String(activeCount)}
          footerLabel="Bisa login sekarang"
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Panel title="Distribusi Role" icon={PieChart} className="flex-2 p-4">
          <WorkerRoleChart countByRole={countByRole} />
        </Panel>

        <Panel title="Status Akun" icon={UserCheck} className="flex flex-1">
          <WorkerStatusChart active={activeCount} inactive={inactiveCount} />
        </Panel>
      </div>

      <WorkerTable rows={rows} />
    </div>
  );
}
