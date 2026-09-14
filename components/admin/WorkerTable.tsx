"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { IdCardIcon as IdCard } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import { Role } from "@/generated/prisma";
import { ROLE_LABEL } from "@/lib/role";

export type WorkerRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  position: string;
  isActive: boolean;
  joinedAt: string;
};

const columns: ColumnDef<WorkerRow>[] = [
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
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Nomor HP",
    cell: ({ row }) => row.original.phone || "—",
  },
  {
    accessorKey: "joinedAt",
    header: "Tanggal Masuk",
  },
  {
    accessorKey: "role",
    header: "Role",
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
      <Button variant="ghost" size="sm" title="Detail" asChild>
        <Link href={`/admin/daftar-pekerja/${row.original.id}`}>
          <IdCard className="size-4" />
          Detail
        </Link>
      </Button>
    ),
  },
];

export default function WorkerTable({ rows }: { rows: WorkerRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Cari"
      emptyMessage="Belum ada pekerja."
      filters={(instance) => (
        <SearchDataTable
          table={instance}
          column="name"
          placeholder="Cari nama pekerja..."
        />
      )}
    />
  );
}
