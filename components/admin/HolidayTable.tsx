"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Pencil2Icon as Pencil,
  TrashIcon as Trash2,
} from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import { HolidayType } from "@/generated/prisma";
import { HOLIDAY_TYPE_LABEL, HOLIDAY_TYPE_VARIANT } from "@/lib/holiday";
import { deleteHoliday } from "@/app/action/holiday.action";

export type HolidayRow = {
  id: string;
  /** "YYYY-MM-DD" untuk input tanggal. */
  date: string;
  dateLabel: string;
  name: string;
  type: HolidayType;
  /** Sudah lewat — ditandai samar supaya daftar tahun berjalan lebih menonjol. */
  isPast: boolean;
};

export default function HolidayTable({ rows }: { rows: HolidayRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<HolidayRow | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!target) return;

    startTransition(async () => {
      const result = await deleteHoliday(target.id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      setTarget(null);
      router.refresh();
    });
  };

  const columns: ColumnDef<HolidayRow>[] = [
    {
      accessorKey: "dateLabel",
      header: "Tanggal",
      cell: ({ row }) => (
        <span
          className={`font-medium whitespace-nowrap ${
            row.original.isPast ? "text-muted-foreground" : ""
          }`}
        >
          {row.original.dateLabel}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama Libur",
    },
    {
      accessorKey: "type",
      header: "Jenis",
      cell: ({ row }) => (
        <Badge variant={HOLIDAY_TYPE_VARIANT[row.original.type]}>
          {HOLIDAY_TYPE_LABEL[row.original.type]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" title="Ubah" asChild>
            <Link href={`/admin/hari-libur/${row.original.id}/edit`}>
              <Pencil className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Hapus"
            onClick={() => setTarget(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        title="Cari"
        emptyMessage="Belum ada hari libur yang terdaftar."
        filters={(instance) => (
          <SearchDataTable
            table={instance}
            column="name"
            placeholder="Cari nama libur..."
          />
        )}
      />

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus hari libur?</AlertDialogTitle>
            <AlertDialogDescription>
              {target &&
                `${target.name} pada ${target.dateLabel} akan kembali dihitung sebagai hari kerja biasa di rekap dan laporan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
