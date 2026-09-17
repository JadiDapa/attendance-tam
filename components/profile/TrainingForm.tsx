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
  createTraining,
  deleteTraining,
  updateTraining,
} from "@/app/action/employee-profile.action";
import {
  TrainingSchema,
  type TrainingInput,
} from "@/servers/validators/employee-profile.validator";

type Entry = {
  id: string;
  name: string;
  organizer: string | null;
  period: string | null;
};

type Props = {
  entries: Entry[];
  targetUserId?: string;
};

const EMPTY: TrainingInput = { name: "", organizer: "", period: "" };

function EntryForm({
  id,
  initial,
  targetUserId,
  onDone,
  onCancel,
}: {
  id: string | null;
  initial: TrainingInput;
  targetUserId?: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrainingInput>({
    resolver: zodResolver(TrainingSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = id
      ? await updateTraining(id, values, targetUserId)
      : await createTraining(values, targetUserId);

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
          <Label htmlFor="name">Nama Pelatihan</Label>
          <Input
            id="name"
            placeholder="Contoh: Pelatihan K3"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-destructive text-sm">{errors.name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="organizer">Penyelenggara</Label>
          <Input
            id="organizer"
            placeholder="Contoh: Kemnaker RI"
            {...register("organizer")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="period">Tahun/Periode</Label>
          <Input id="period" placeholder="Contoh: 2024" {...register("period")} />
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

export default function TrainingForm({ entries, targetUserId }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus pelatihan ini?")) return;

    setDeletingId(id);
    const result = await deleteTraining(id, targetUserId);
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
        Opsional — tambahkan pelatihan/seminar/sertifikasi sebanyak yang perlu.
      </p>

      {entries.length === 0 && !adding && (
        <p className="text-muted-foreground text-sm">Belum ada pelatihan.</p>
      )}

      {entries.map((entry) =>
        editingId === entry.id ? (
          <div key={entry.id} className="rounded-lg border p-4">
            <EntryForm
              id={entry.id}
              initial={{
                name: entry.name,
                organizer: entry.organizer ?? "",
                period: entry.period ?? "",
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
                <p className="text-muted-foreground text-xs">Nama Pelatihan</p>
                <p className="text-sm font-medium">{entry.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Penyelenggara</p>
                <p className="text-sm font-medium">{entry.organizer || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tahun/Periode</p>
                <p className="text-sm font-medium">{entry.period || "—"}</p>
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
          Tambah Pelatihan
        </Button>
      )}
    </div>
  );
}
