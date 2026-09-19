"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import EditAttendanceTimeDialog from "@/components/admin/EditAttendanceTimeDialog";
import ManualAttendanceDialog from "@/components/admin/ManualAttendanceDialog";
import { AttendanceType } from "@/generated/prisma";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import {
  ADMIN_ADDED_LABEL,
  ADMIN_EDITED_LABEL,
  ATTENDANCE_TYPE_LABEL,
  DAY_STATUS_LABEL,
  DAY_STATUS_VARIANT,
  type RecapRow,
} from "@/lib/attendance";
import { cn } from "@/lib/utils";

function AttendanceEntryCell({
  row,
  type,
  edit,
}: {
  row: RecapRow;
  type: AttendanceType;
  /** Diisi hanya untuk admin — memunculkan tombol ubah/tambah. */
  edit?: { workDate: string };
}) {
  const entry = type === AttendanceType.CHECK_IN ? row.checkIn : row.checkOut;

  if (!entry) {
    return edit ? (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">—</span>
        <ManualAttendanceDialog
          compact
          employees={[{ id: row.userId, name: row.name }]}
          defaultUserId={row.userId}
          defaultDate={edit.workDate}
          defaultType={type}
        />
      </div>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }

  return (
    <div className="whitespace-nowrap">
      <div className="flex items-center gap-1">
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
        {edit && (
          <EditAttendanceTimeDialog
            attendanceId={entry.id}
            employeeName={row.name}
            label={ATTENDANCE_TYPE_LABEL[type]}
            time={entry.time}
          />
        )}
      </div>
      {(entry.addedByAdmin || entry.editedByAdmin) && (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {entry.addedByAdmin && (
            <Badge variant="outline" className="text-[10px]">
              {ADMIN_ADDED_LABEL}
            </Badge>
          )}
          {entry.editedByAdmin && (
            <Badge
              variant="outline"
              className="text-[10px]"
              title={
                [
                  entry.originalTime ? `Jam asli ${entry.originalTime}` : null,
                  entry.editNote,
                ]
                  .filter(Boolean)
                  .join(" — ") || undefined
              }
            >
              {ADMIN_EDITED_LABEL}
              {entry.originalTime ? ` (asli ${entry.originalTime})` : ""}
            </Badge>
          )}
        </div>
      )}
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

function buildColumns(edit?: { workDate: string }): ColumnDef<RecapRow>[] {
  return [
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
    cell: ({ row }) => (
      <AttendanceEntryCell
        row={row.original}
        type={AttendanceType.CHECK_IN}
        edit={edit}
      />
    ),
  },
  {
    id: "checkOut",
    header: "Absen Pulang",
    cell: ({ row }) => (
      <AttendanceEntryCell
        row={row.original}
        type={AttendanceType.CHECK_OUT}
        edit={edit}
      />
    ),
  },
  ];
}

export default function AttendanceRecapTable({
  rows,
  bare = false,
  editDate,
}: {
  rows: RecapRow[];
  bare?: boolean;
  /**
   * "YYYY-MM-DD" — kalau diisi (khusus admin), tiap sel jam mendapat tombol
   * ubah/tambah untuk tanggal ini.
   */
  editDate?: string;
}) {
  return (
    <DataTable
      columns={buildColumns(editDate ? { workDate: editDate } : undefined)}
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
