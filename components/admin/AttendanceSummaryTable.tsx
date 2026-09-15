"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import SelectDataTable from "@/components/dashboard/SelectDataTable";
import TableSorter from "@/components/dashboard/TableSorter";
import { Role } from "@/generated/prisma";
import { ROLE_LABEL } from "@/lib/role";

const ROLE_OPTIONS = Object.values(Role).map((value) => ({
  value,
  label: ROLE_LABEL[value],
}));

const STATUS_OPTIONS = [
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

/** Rekap satu pekerja terhitung sepanjang rentang tanggal yang dipilih. */
export type AttendanceSummaryRow = {
  id: string;
  name: string;
  position: string;
  role: Role;
  isActive: boolean;
  /** Rekap pada rentang tanggal yang dipilih. Akun admin tidak punya rekap. */
  hasRecap: boolean;
  totalHadirDikantor: number;
  totalDinasLuar: number;
  totalTerlambat: number;
  totalAlfa: number;
  totalIzin: number;
  totalSakit: number;
  totalCuti: number;
};

/** Kolom angka rekap — nol ditulis samar supaya angka penting lebih menonjol. */
function RecapCell({
  value,
  hasRecap,
  hint,
}: {
  value: number;
  hasRecap: boolean;
  hint?: string;
}) {
  if (!hasRecap) return <span className="text-muted-foreground">—</span>;

  return (
    <div>
      <p
        className={cn(
          "font-medium tabular-nums",
          value === 0 && "text-muted-foreground font-normal",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

const columns: ColumnDef<AttendanceSummaryRow>[] = [
  {
    accessorKey: "name",
    header: "Nama",
    cell: ({ row }) => (
      <div className="min-w-40">
        <Link
          href={`/admin/daftar-pekerja/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {row.original.position || "Tanpa jabatan"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "totalHadirDikantor",
    header: ({ column }) => <TableSorter column={column} header="Di Kantor" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalHadirDikantor}
        hasRecap={row.original.hasRecap}
        hint={
          row.original.totalTerlambat > 0
            ? `${row.original.totalTerlambat} telat`
            : undefined
        }
      />
    ),
  },
  {
    accessorKey: "totalDinasLuar",
    header: ({ column }) => <TableSorter column={column} header="Dinas Luar" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalDinasLuar}
        hasRecap={row.original.hasRecap}
      />
    ),
  },
  {
    accessorKey: "totalAlfa",
    header: ({ column }) => <TableSorter column={column} header="Alfa" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalAlfa}
        hasRecap={row.original.hasRecap}
      />
    ),
  },
  {
    accessorKey: "totalIzin",
    header: ({ column }) => <TableSorter column={column} header="Izin" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalIzin}
        hasRecap={row.original.hasRecap}
      />
    ),
  },
  {
    accessorKey: "totalSakit",
    header: ({ column }) => <TableSorter column={column} header="Sakit" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalSakit}
        hasRecap={row.original.hasRecap}
      />
    ),
  },
  {
    accessorKey: "totalCuti",
    header: ({ column }) => <TableSorter column={column} header="Cuti" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalCuti}
        hasRecap={row.original.hasRecap}
      />
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge
        variant={row.original.role === Role.EMPLOYEE ? "secondary" : "default"}
      >
        {ROLE_LABEL[row.original.role]}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="secondary">Aktif</Badge>
      ) : (
        <Badge variant="destructive">Nonaktif</Badge>
      ),
  },
];

export default function AttendanceSummaryTable({
  rows,
}: {
  rows: AttendanceSummaryRow[];
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Cari"
      emptyMessage="Belum ada pekerja."
      filters={(instance) => (
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <div className="w-full sm:w-64">
            <SearchDataTable
              table={instance}
              column="name"
              placeholder="Cari nama pekerja..."
            />
          </div>
          <SelectDataTable
            table={instance}
            column="role"
            options={ROLE_OPTIONS}
            placeholder="Role"
            allLabel="Semua Role"
          />
          <SelectDataTable
            table={instance}
            column="isActive"
            options={STATUS_OPTIONS}
            placeholder="Status"
            allLabel="Semua Status"
          />
        </div>
      )}
    />
  );
}
