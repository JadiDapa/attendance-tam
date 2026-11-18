"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { IdCardIcon as IdCard } from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  divisionId?: string | null;
  divisionName?: string | null;
  positionId?: string | null;
  positionName?: string | null;
  isActive: boolean;
  joinedAt: string;
  profileImageUrl: string | null;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
    // Mengindeks nama, nomor HP, email, divisi, dan jabatan agar pencarian teks
    // menemukan pekerja berdasarkan kata kunci identitas maupun penempatannya.
    accessorFn: (row) =>
      `${row.name} ${row.phone} ${row.email} ${row.divisionName || ""} ${row.position || ""}`,
    header: "Nama",
    cell: ({ row }) => (
      <div className="flex min-w-40 items-center gap-3">
        <Avatar>
          {row.original.profileImageUrl && (
            <AvatarImage
              src={row.original.profileImageUrl}
              alt={`Foto ${row.original.name}`}
            />
          )}
          <AvatarFallback>{initials(row.original.name)}</AvatarFallback>
        </Avatar>
        <Link
          href={`/admin/daftar-pekerja/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "divisionName",
    header: "Divisi",
    filterFn: "equalsString",
    cell: ({ row }) =>
      row.original.divisionName ? (
        <Badge variant="outline">{row.original.divisionName}</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    accessorKey: "position",
    header: "Jabatan",
    filterFn: "equalsString",
    cell: ({ row }) =>
      row.original.position ? (
        <span className="text-sm font-medium">{row.original.position}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
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

export default function WorkerTable({
  rows,
  divisionOptions = [],
  positionOptions = [],
}: {
  rows: WorkerRow[];
  divisionOptions?: { value: string; label: string }[];
  positionOptions?: { value: string; label: string }[];
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
              column="search"
              placeholder="Cari nama, HP, email, posisi..."
            />
          </div>
          {divisionOptions.length > 0 && (
            <SelectDataTable
              table={instance}
              column="divisionName"
              options={divisionOptions}
              placeholder="Divisi"
              allLabel="Semua Divisi"
            />
          )}
          {positionOptions.length > 0 && (
            <SelectDataTable
              table={instance}
              column="position"
              options={positionOptions}
              placeholder="Jabatan"
              allLabel="Semua Jabatan"
            />
          )}
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
