"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/dashboard/DataTable";
import AttendanceLocationBadge from "@/components/dashboard/AttendanceLocationBadge";
import CheckOutCell from "@/components/dashboard/CheckOutCell";
import AttendanceDayCard from "./AttendanceDayCard";
import AttendanceDayDialog from "./AttendanceDayDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CALENDAR_STATUS_LABEL,
  DAY_STATUS_VARIANT,
  type AttendanceDay,
} from "@/lib/attendance";

/**
 * Tampilan kolom: satu baris per tanggal — termasuk hari izin dan hari tanpa
 * absensi — jadi isinya sama persis dengan kalender.
 */
export default function AttendanceDayTable({ days }: { days: AttendanceDay[] }) {
  const [selected, setSelected] = useState<AttendanceDay | null>(null);

  const columns: ColumnDef<AttendanceDay>[] = [
    {
      accessorKey: "dateLabel",
      header: "Tanggal",
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.dateLabel}
          {row.original.isToday && (
            <span className="text-primary-subtle ml-1.5 text-xs">hari ini</span>
          )}
        </span>
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
      id: "duration",
      header: "Durasi",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.durationLabel ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const { status, statusDetail } = row.original;

        return (
          <div className="space-y-1">
            <Badge
              variant={
                status === "KOSONG" ? "outline" : DAY_STATUS_VARIANT[status]
              }
            >
              {CALENDAR_STATUS_LABEL[status]}
            </Badge>
            {statusDetail && (
              <p className="text-muted-foreground text-xs">{statusDetail}</p>
            )}
          </div>
        );
      },
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
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={!row.original.checkIn && !row.original.checkOut}
          onClick={() => setSelected(row.original)}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={days}
        bare
        emptyMessage="Tidak ada tanggal untuk filter ini."
        onRowClick={(day: AttendanceDay) => {
          if (day.checkIn || day.checkOut) setSelected(day);
        }}
        renderMobileCard={(day: AttendanceDay) => <AttendanceDayCard day={day} />}
      />

      <AttendanceDayDialog
        day={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
