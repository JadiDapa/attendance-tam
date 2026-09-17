"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon as Plus, TrashIcon as Trash } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  createWorkHistory,
  deleteWorkHistory,
  updateWorkHistory,
} from "@/app/action/employee-profile.action";
import {
  WorkHistorySchema,
  type WorkHistoryInput,
} from "@/servers/validators/employee-profile.validator";

type Entry = {
  id: string;
  previousCompany: string | null;
  previousPosition: string | null;
  previousDuration: string | null;
};

type Props = {
  entries: Entry[];
  targetUserId?: string;
};

const EMPTY: WorkHistoryInput = {
  previousCompany: "",
  previousPosition: "",
  previousDuration: "",
};

function EntryForm({
  id,
  initial,
  targetUserId,
  onDone,
  onCancel,
}: {
  id: string | null;
  initial: WorkHistoryInput;
  targetUserId?: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<WorkHistoryInput>({
    resolver: zodResolver(WorkHistorySchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = id
      ? await updateWorkHistory(id, values, targetUserId)
      : await createWorkHistory(values, targetUserId);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="previousCompany">Perusahaan Sebelumnya</Label>
          <Input id="previousCompany" {...register("previousCompany")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="previousPosition">Posisi Sebelumnya</Label>
          <Input id="previousPosition" {...register("previousPosition")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="previousDuration">Lama Bekerja</Label>
          <Input
            id="previousDuration"
            placeholder="Contoh: 2 tahun 3 bulan"
            {...register("previousDuration")}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Simpan
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}

export default function WorkHistoryForm({ entries, targetUserId }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus riwayat pekerjaan ini?")) return;

    setDeletingId(id);
    const result = await deleteWorkHistory(id, targetUserId);
    setDeletingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-xs">
        Opsional — tambahkan riwayat pekerjaan sebelumnya sebanyak yang perlu.
      </p>

      {entries.length === 0 && !adding && (
        <p className="text-muted-foreground text-sm">Belum ada riwayat pekerjaan.</p>
      )}

      {entries.map((entry) =>
        editingId === entry.id ? (
          <div key={entry.id} className="rounded-lg border p-4">
            <EntryForm
              id={entry.id}
              initial={{
                previousCompany: entry.previousCompany ?? "",
                previousPosition: entry.previousPosition ?? "",
                previousDuration: entry.previousDuration ?? "",
              }}
              targetUserId={targetUserId}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          </div>
        ) : (
          <div
            key={entry.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
              <div>
                <p className="text-muted-foreground text-xs">Perusahaan</p>
                <p className="text-sm font-medium">{entry.previousCompany || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Posisi</p>
                <p className="text-sm font-medium">{entry.previousPosition || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Lama Bekerja</p>
                <p className="text-sm font-medium">{entry.previousDuration || "—"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingId(entry.id)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deletingId === entry.id}
                onClick={() => handleDelete(entry.id)}
              >
                {deletingId === entry.id ? <Spinner /> : <Trash className="size-4" />}
                Hapus
              </Button>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <div className="rounded-lg border p-4">
          <EntryForm
            id={null}
            initial={EMPTY}
            targetUserId={targetUserId}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="w-fit">
          <Plus className="size-4" />
          Tambah Riwayat Pekerjaan
        </Button>
      )}
    </div>
  );
}
