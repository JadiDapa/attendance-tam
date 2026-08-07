"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AttendanceEntryDetail from "@/components/dashboard/AttendanceEntryDetail";
import AttendanceLocationBadge from "@/components/dashboard/AttendanceLocationBadge";
import CheckOutCell from "@/components/dashboard/CheckOutCell";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import {
  RECAP_STATUS_LABEL,
  RECAP_STATUS_VARIANT,
  type RecapRow,
} from "@/lib/attendance";

function DetailDialog({ row }: { row: RecapRow }) {
  const hasEntry = row.checkIn || row.checkOut;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!hasEntry}>
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            Foto dan koordinat absensi yang terekam.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {row.checkIn && <AttendanceEntryDetail entry={row.checkIn} />}
          {row.checkOut && <AttendanceEntryDetail entry={row.checkOut} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const columns: ColumnDef<RecapRow>[] = [
  {
    accessorKey: "name",
    header: "Karyawan",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        {row.original.position && (
          <p className="text-muted-foreground text-xs">
            {row.original.position}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "checkIn",
    header: "Masuk",
    cell: ({ row }) => (
      <CheckOutCell entry={row.original.checkIn} missing={false} />
    ),
  },
  {
    id: "checkOut",
    header: "Pulang",
    cell: ({ row }) => (
      <CheckOutCell
        entry={row.original.checkOut}
        missing={row.original.missingCheckOut}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="space-y-1">
        <Badge variant={RECAP_STATUS_VARIANT[row.original.status]}>
          {RECAP_STATUS_LABEL[row.original.status]}
        </Badge>
        {row.original.statusDetail && (
          <p className="text-muted-foreground text-xs">
            {row.original.statusDetail}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "radius",
    header: "Lokasi",
    cell: ({ row }) => (
      <AttendanceLocationBadge
        entries={[row.original.checkIn, row.original.checkOut]}
      />
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <DetailDialog row={row.original} />,
  },
];

export default function AttendanceRecapTable({
  rows,
  bare = false,
}: {
  rows: RecapRow[];
  bare?: boolean;
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      bare={bare}
      title="Cari"
      emptyMessage="Tidak ada data untuk filter ini."
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
