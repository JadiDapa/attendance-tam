import {
  CheckCircledIcon as CheckCircle2,
  PlusIcon as Plus,
  IdCardIcon as UserCheck,
  CrossCircledIcon as UserX,
  AvatarIcon as Users,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import DateRangeNav from "@/components/dashboard/DateRangeNav";
import StatTile from "@/components/dashboard/StatTile";
import EmployeeFormDialog from "@/components/admin/EmployeeFormDialog";
import EmployeeTable, {
  type EmployeeRow,
} from "@/components/admin/EmployeeTable";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { resolveAttendanceRange } from "@/lib/attendance-days";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { ReportService } from "@/servers/services/report.service";
import { UserService } from "@/servers/services/user.service";

type SearchParams = { start?: string; end?: string };

type Recap = {
  hadirDikantor: number;
  wfh: number;
  dinasLuar: number;
  terlambat: number;
  alfa: number;
  izin: number;
  sakit: number;
  cuti: number;
};

function emptyRecap(): Recap {
  return {
    hadirDikantor: 0,
    wfh: 0,
    dinasLuar: 0,
    terlambat: 0,
    alfa: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
  };
}

export default async function RekapanKaryawanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const today = getWorkDate();
  const range = resolveAttendanceRange(await searchParams, today);

  const [users, recapRows] = await Promise.all([
    UserService.list(),
    ReportService.buildRecap({
      startDate: range.startDate,
      endDate: range.endDate,
    }),
  ]);

  const recapByUser = new Map<string, Recap>();

  for (const row of recapRows) {
    const recap = recapByUser.get(row.user.id) ?? emptyRecap();

    if (row.status === "HADIR_DIKANTOR") recap.hadirDikantor += 1;
    if (row.status === "WFH") recap.wfh += 1;
    if (row.status === "DINAS_LUAR") recap.dinasLuar += 1;

    // Terlambat adalah atribut absen masuk, bukan status — sudah ikut terhitung
    // di `hadirDikantor`.
    if (row.status === "HADIR_DIKANTOR" && row.checkIn?.isLate) {
      recap.terlambat += 1;
    }

    // Hari libur sudah berstatus LIBUR sejak `buildRecap`, jadi di sini tinggal
    // menyaring hari yang belum lewat — hari berjalan belum bisa disebut bolos.
    if (row.status === "ALFA" && row.workDate.getTime() < today.getTime()) {
      recap.alfa += 1;
    }

    // Hari yang benar-benar dipakai izin/sakit/cuti — kalau karyawan tetap
    // absen, statusnya sudah jadi kehadiran di atas.
    if (row.status === "IZIN") recap.izin += 1;
    if (row.status === "SAKIT") recap.sakit += 1;
    if (row.status === "CUTI") recap.cuti += 1;

    recapByUser.set(row.user.id, recap);
  }

  const rows: EmployeeRow[] = users.map((user) => {
    const recap = recapByUser.get(user.id) ?? emptyRecap();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? "",
      position: user.position ?? "",
      isActive: user.isActive,
      createdAt: formatWorkDate(getWorkDate(user.createdAt)),
      hasRecap: user.role === Role.EMPLOYEE,
      totalHadirDikantor: recap.hadirDikantor,
      totalWfh: recap.wfh,
      totalDinasLuar: recap.dinasLuar,
      totalTerlambat: recap.terlambat,
      totalAlfa: recap.alfa,
      totalIzin: recap.izin,
      totalSakit: recap.sakit,
      totalCuti: recap.cuti,
    };
  });

  const activeCount = rows.filter((row) => row.isActive).length;
  const rangeLabel = `${formatWorkDate(range.startDate)} — ${formatWorkDate(range.endDate)}`;

  // Cuma karyawan (hasRecap) yang punya angka kehadiran — admin tidak absen.
  const recapEligible = rows.filter((row) => row.hasRecap);
  const totalHadir = recapEligible.reduce(
    (sum, row) =>
      sum + row.totalHadirDikantor + row.totalWfh + row.totalDinasLuar,
    0,
  );
  const totalAlfa = recapEligible.reduce((sum, row) => sum + row.totalAlfa, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekapan Karyawan"
        subtitle={`${activeCount} aktif dari ${rows.length} akun · rekap ${rangeLabel}`}
        actions={
          <>
            <DateRangeNav
              start={toDateInputValue(range.startDate)}
              end={toDateInputValue(range.endDate)}
              today={toDateInputValue(today)}
              label={rangeLabel.replace("—", "–")}
              basePath="/admin/rekapan-karyawan"
            />
            <EmployeeFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  Tambah Karyawan
                </Button>
              }
            />
          </>
        }
      />

      {range.error && (
        <p className="text-destructive text-sm">
          {range.error} — menampilkan bulan ini.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Akun"
          icon={Users}
          value={String(rows.length)}
          footerLabel={`${activeCount} aktif · ${rows.length - activeCount} nonaktif`}
        />
        <StatTile
          label="Akun Aktif"
          icon={UserCheck}
          value={String(activeCount)}
          footerLabel="Bisa login sekarang"
        />
        <StatTile
          label="Total Hadir"
          icon={CheckCircle2}
          value={String(totalHadir)}
          footerLabel={`Kantor, WFH, dinas luar · ${rangeLabel}`}
        />
        <StatTile
          label="Total Alfa"
          icon={UserX}
          value={String(totalAlfa)}
          footerLabel={`Sepanjang ${rangeLabel}`}
        />
      </div>

      <EmployeeTable rows={rows} />
    </div>
  );
}
