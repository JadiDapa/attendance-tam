import {
  LayersIcon as Layers,
  PersonIcon as Briefcase,
  CheckCircledIcon as CheckCircle2,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DivisionManagement, {
  type DivisionItem,
} from "@/components/admin/DivisionManagement";
import PositionManagement, {
  type PositionItem,
} from "@/components/admin/PositionManagement";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate } from "@/lib/date";
import { DivisionService } from "@/servers/services/division.service";
import prisma from "@/lib/prisma";

export default async function DivisiJabatanPage() {
  await requireRole(Role.ADMIN);

  const [divisionsData, positionsData, totalUsersWithPosition] = await Promise.all([
    DivisionService.list(),
    DivisionService.listPositions(),
    prisma.user.count({
      where: {
        divisionId: { not: null },
        positionId: { not: null },
      },
    }),
  ]);

  const divisionItems: DivisionItem[] = divisionsData.map((d) => ({
    id: d.id,
    name: d.name,
    positionsCount: d._count.positions,
    usersCount: d._count.users,
    createdAt: formatWorkDate(getWorkDate(d.createdAt)),
  }));

  const positionItems: PositionItem[] = positionsData.map((p) => ({
    id: p.id,
    name: p.name,
    divisionId: p.divisionId,
    divisionName: p.division.name,
    usersCount: p._count.users,
    createdAt: formatWorkDate(getWorkDate(p.createdAt)),
  }));

  const divisionOptions = divisionsData.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back
        title="Divisi & Jabatan"
        subtitle="Kelola data master grup divisi perusahaan dan penataan struktur posisi/jabatan karyawan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total Divisi"
          icon={Layers}
          value={String(divisionsData.length)}
          footerLabel="Divisi aktif terdaftar"
        />
        <StatTile
          label="Total Jabatan"
          icon={Briefcase}
          value={String(positionsData.length)}
          footerLabel="Posisi spesifik dalam divisi"
        />
        <StatTile
          label="Karyawan Terpetakan"
          icon={CheckCircle2}
          value={String(totalUsersWithPosition)}
          footerLabel="Memiliki divisi & jabatan resmi"
        />
      </div>

      <Tabs defaultValue="division" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-72">
          <TabsTrigger value="division" className="gap-2">
            <Layers className="size-4" />
            Divisi
          </TabsTrigger>
          <TabsTrigger value="position" className="gap-2">
            <Briefcase className="size-4" />
            Jabatan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="division" className="mt-4">
          <DivisionManagement divisions={divisionItems} />
        </TabsContent>

        <TabsContent value="position" className="mt-4">
          <PositionManagement
            positions={positionItems}
            divisions={divisionOptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
