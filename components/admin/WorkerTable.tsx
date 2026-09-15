"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { IdCardIcon as IdCard } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import SelectDataTable from "@/components/dashboard/SelectDataTable";
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

const ROLE_OPTIONS = Object.values(Role).map((value) => ({
  value,
  label: ROLE_LABEL[value],
}));

const STATUS_OPTIONS = [
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

const columns: ColumnDef<WorkerRow>[] = [
  {
    id: "search",
    // Gabungan nama + nomor HP + email supaya satu kotak cari bisa dipakai
    // untuk ketiganya — sortir tetap memakai "name" lewat kolom terpisah.
    accessorFn: (row) => `${row.name} ${row.phone} ${row.email}`,
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
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <div className="w-full sm:w-64">
            <SearchDataTable
              table={instance}
              column="search"
              placeholder="Cari nama, HP, atau email..."
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
