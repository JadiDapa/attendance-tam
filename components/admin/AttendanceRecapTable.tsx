"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import {
  DAY_STATUS_LABEL,
  DAY_STATUS_VARIANT,
  type RecapRow,
} from "@/lib/attendance";
import { cn } from "@/lib/utils";

function AttendanceEntryCell({
  entry,
}: {
  entry: RecapRow["checkIn"] | RecapRow["checkOut"];
}) {
  if (!entry) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="whitespace-nowrap">
      <p
        className={cn(
          "font-medium tabular-nums",
          entry.isLate && "text-destructive",
        )}
      >
        {entry.time}
        {entry.isLate && (
          <span className="text-destructive ml-1.5 text-xs font-normal">
            Telat
          </span>
        )}
      </p>
      {entry.photoUrl && (
        <Button variant="link" size="sm" asChild className="h-auto p-0">
          <a href={entry.photoUrl} target="_blank" rel="noreferrer">
            Lihat Foto
          </a>
        </Button>
      )}
    </div>
  );
}

const columns: ColumnDef<RecapRow>[] = [
  {
    accessorKey: "name",
    header: "Karyawan",
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <Badge variant={DAY_STATUS_VARIANT[row.original.status]}>
          {DAY_STATUS_LABEL[row.original.status]}
        </Badge>
        {row.original.statusDetail && (
          <p className="text-muted-foreground max-w-48 text-xs">
            {row.original.statusDetail}
          </p>
        )}
        {row.original.pendingApproval && (
          <Badge variant="outline">Menunggu Approval</Badge>
        )}
        {row.original.missingCheckOut && (
          <Badge variant="outline">Belum Absen Pulang</Badge>
        )}
      </div>
    ),
  },
  {
    id: "checkIn",
    header: "Absen Masuk",
    cell: ({ row }) => <AttendanceEntryCell entry={row.original.checkIn} />,
  },
  {
    id: "checkOut",
    header: "Absen Pulang",
    cell: ({ row }) => <AttendanceEntryCell entry={row.original.checkOut} />,
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
      title="Cari"
      bare={bare}
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
