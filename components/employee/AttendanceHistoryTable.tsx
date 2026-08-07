"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";

export type AttendanceHistoryRow = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
  outsideRadius: boolean;
  distanceLabel: string | null;
  photoUrl: string | null;
};

const columns: ColumnDef<AttendanceHistoryRow>[] = [
  {
    accessorKey: "date",
    header: "Tanggal",
    cell: ({ row }) => <span className="font-medium">{row.original.date}</span>,
  },
  {
    accessorKey: "checkInTime",
    header: "Masuk",
    cell: ({ row }) => row.original.checkInTime ?? "—",
  },
  {
    accessorKey: "checkOutTime",
    header: "Pulang",
    cell: ({ row }) => row.original.checkOutTime ?? "—",
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1.5">
        {row.original.isLate ? (
          <Badge variant="destructive">Terlambat</Badge>
        ) : (
          <Badge variant="secondary">Tepat waktu</Badge>
        )}
        {row.original.outsideRadius && (
          <Badge variant="destructive">
            Di luar radius
            {row.original.distanceLabel ? ` (${row.original.distanceLabel})` : ""}
          </Badge>
        )}
      </div>
    ),
  },
  {
    id: "photo",
    header: "Foto",
    cell: ({ row }) =>
      row.original.photoUrl ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={row.original.photoUrl} target="_blank">
            Lihat
          </Link>
        </Button>
      ) : (
        "—"
      ),
  },
];

export default function AttendanceHistoryTable({
  rows,
}: {
  rows: AttendanceHistoryRow[];
}) {
  return <DataTable columns={columns} data={rows} />;
}
