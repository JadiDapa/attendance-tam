"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Pencil2Icon as Pencil,
  LightningBoltIcon as Power,
  CircleBackslashIcon as PowerOff,
} from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import TableSorter from "@/components/dashboard/TableSorter";
import { Role } from "@/generated/prisma";
import { setEmployeeActive } from "@/app/action/user.action";
import EmployeeFormDialog, {
  type EmployeeFormValues,
} from "./EmployeeFormDialog";

export type EmployeeRow = EmployeeFormValues & {
  isActive: boolean;
  createdAt: string;
  /** Rekap pada rentang tanggal yang dipilih. Akun admin tidak punya rekap. */
  hasRecap: boolean;
  totalHadirDikantor: number;
  totalWfh: number;
  totalDinasLuar: number;
  totalTerlambat: number;
  totalAlfa: number;
  totalIzin: number;
  totalSakit: number;
  totalCuti: number;
};

function StatusButton({ employee }: { employee: EmployeeRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await setEmployeeActive(employee.id, !employee.isActive);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={employee.isActive ? "Nonaktifkan" : "Aktifkan"}
    >
      {employee.isActive ? (
        <PowerOff className="size-4" />
      ) : (
        <Power className="size-4" />
      )}
    </Button>
  );
}

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

const columns: ColumnDef<EmployeeRow>[] = [
  {
    accessorKey: "name",
    header: "Nama",
    cell: ({ row }) => (
      <div className="min-w-40">
        <p className="font-medium">{row.original.name}</p>
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
    accessorKey: "totalWfh",
    header: ({ column }) => <TableSorter column={column} header="WFH" />,
    cell: ({ row }) => (
      <RecapCell
        value={row.original.totalWfh}
        hasRecap={row.original.hasRecap}
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
    cell: ({ row }) => (
      <Badge
        variant={row.original.role === Role.ADMIN ? "default" : "secondary"}
      >
        {row.original.role === Role.ADMIN ? "Admin" : "Karyawan"}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="secondary">Aktif</Badge>
      ) : (
        <Badge variant="destructive">Nonaktif</Badge>
      ),
  },
  {
    id: "actions",
    header: "Aksi",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <EmployeeFormDialog
          employee={row.original}
          trigger={
            <Button variant="ghost" size="sm" title="Edit">
              <Pencil className="size-4" />
            </Button>
          }
        />
        <StatusButton employee={row.original} />
      </div>
    ),
  },
];

export default function EmployeeTable({ rows }: { rows: EmployeeRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Cari"
      emptyMessage="Belum ada karyawan."
      filters={(instance) => (
        <SearchDataTable
          table={instance}
          column="name"
          placeholder="Cari nama karyawan..."
        />
      )}
    />
  );
}
