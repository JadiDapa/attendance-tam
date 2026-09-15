"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PersonIcon as UserPlus } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import { Role } from "@/generated/prisma";
import { ROLE_LABEL } from "@/lib/role";
import { reviewAccountRequest } from "@/app/action/account-request.action";

export type AccountRequestRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  submittedLabel: string;
};

export default function AccountRequestApprovalTable({
  rows,
}: {
  rows: AccountRequestRow[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<AccountRequestRow | null>(null);
  const [role, setRole] = useState<Role>(Role.EMPLOYEE);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null,
  );

  const openDialog = (row: AccountRequestRow) => {
    setTarget(row);
    setRole(Role.EMPLOYEE);
    setNote("");
  };

  const closeDialog = () => {
    setTarget(null);
    setNote("");
  };

  const decide = async (action: "APPROVE" | "REJECT") => {
    if (!target) return;

    setSubmitting(action === "APPROVE" ? "approve" : "reject");

    const result = await reviewAccountRequest(target.id, {
      action,
      role,
      reviewNote: note,
    });

    setSubmitting(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    closeDialog();
    router.refresh();
  };

  const columns: ColumnDef<AccountRequestRow>[] = [
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-muted-foreground text-xs">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Nomor HP",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "submittedLabel",
      header: "Diajukan",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.submittedLabel}</span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          title="Tinjau"
          onClick={() => openDialog(row.original)}
        >
          <UserPlus className="size-4" />
          Tinjau
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        title="Cari"
        emptyMessage="Tidak ada pengajuan akun yang menunggu persetujuan."
        filters={(instance) => (
          <SearchDataTable
            table={instance}
            column="name"
            placeholder="Cari nama pemohon..."
          />
        )}
      />

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pengajuan Pembuatan Akun</DialogTitle>
            <DialogDescription>
              {target && `${target.name} · ${target.email}`}
            </DialogDescription>
          </DialogHeader>

          {target?.phone && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium">
                Nomor HP
              </p>
              <p className="mt-1 text-sm">{target.phone}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Role).map((value) => (
                  <SelectItem key={value} value={value}>
                    {ROLE_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reviewNote">Catatan (opsional)</Label>
            <Textarea
              id="reviewNote"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              placeholder="Contoh: sudah dikonfirmasi lewat telepon"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => decide("REJECT")}
              disabled={submitting !== null}
            >
              {submitting === "reject" && <Spinner />}
              Tolak
            </Button>
            <Button
              onClick={() => decide("APPROVE")}
              disabled={submitting !== null}
            >
              {submitting === "approve" && <Spinner />}
              Setujui &amp; Buat Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
