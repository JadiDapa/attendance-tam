import PageHeader from "@/components/dashboard/PageHeader";
import DivisionTreeView, {
  type DivisionPerson,
} from "@/components/admin/DivisionTreeView";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { buildDivisionTree, type PositionGroup } from "@/lib/division";
import { DivisionService } from "@/servers/services/division.service";

/**
 * Graph Divisi: Manager → Divisi → Jabatan → orang. Khusus Role Admin —
 * layout `(admin)` sudah menjaga, `requireRole` di sini supaya halaman tetap
 * aman walau dipindah.
 */
export default async function DivisiPage() {
  await requireRole(Role.ADMIN);

  const { divisions, positions, users } = await DivisionService.listStructure();
  const tree = buildDivisionTree<DivisionPerson>({ divisions, positions, users });

  const positionGroups: PositionGroup[] = tree.divisions.map((division) => ({
    divisionId: division.id,
    divisionName: division.name,
    positions: division.positions.map(({ id, name }) => ({ id, name })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back
        title="Divisi"
        subtitle="Struktur Manager → Divisi → Jabatan → orang. Divisi seseorang mengikuti Jabatannya; Role diatur terpisah di Daftar Pekerja."
      />

      <DivisionTreeView tree={tree} positionGroups={positionGroups} />
    </div>
  );
}
