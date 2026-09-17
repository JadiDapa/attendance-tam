"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormInput } from "@/components/mobile/form-input";
import { MobilePageHeader } from "@/components/mobile/page-header";
import {
  createTraining,
  deleteTraining,
  updateTraining,
} from "@/app/action/employee-profile.action";
import type { ApiTraining } from "@/lib/mobile-queries";

type FormState = { name: string; organizer: string; period: string };

const EMPTY: FormState = { name: "", organizer: "", period: "" };

function EntryForm({
  id,
  initial,
  onDone,
  onCancel,
}: {
  id: string | null;
  initial: FormState;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(initial);

  function handleSubmit() {
    startTransition(async () => {
      const result = id ? await updateTraining(id, form) : await createTraining(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="bg-muted flex flex-col gap-4 rounded-2xl p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-foreground text-sm font-medium">Nama Pelatihan</span>
        <FormInput
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Contoh: Pelatihan K3"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-foreground text-sm font-medium">Penyelenggara</span>
        <FormInput
          value={form.organizer}
          onChange={(e) => setForm({ ...form, organizer: e.target.value })}
          placeholder="Contoh: Kemnaker RI"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-foreground text-sm font-medium">Tahun/Periode</span>
        <FormInput
          value={form.period}
          onChange={(e) => setForm({ ...form, period: e.target.value })}
          placeholder="Contoh: 2024"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-primary text-primary-foreground flex-1 rounded-xl py-3 text-center font-medium disabled:opacity-60"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-background text-foreground rounded-xl px-4 py-3 text-center font-medium"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/** Mirrors mobile's `employee-data-training.tsx` — list + add/edit/delete, per-entry structured fields. */
export function TrainingForm({ initial }: { initial: ApiTraining[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus pelatihan ini?")) return;

    setDeletingId(id);
    const result = await deleteTraining(id);
    setDeletingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Pelatihan" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <span className="text-muted-foreground text-xs">
          Opsional — tambahkan pelatihan/seminar/sertifikasi sebanyak yang perlu.
        </span>

        {initial.length === 0 && !adding && (
          <p className="text-muted-foreground text-sm">Belum ada pelatihan.</p>
        )}

        {initial.map((entry) =>
          editingId === entry.id ? (
            <EntryForm
              key={entry.id}
              id={entry.id}
              initial={{
                name: entry.name,
                organizer: entry.organizer ?? "",
                period: entry.period ?? "",
              }}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={entry.id} className="bg-muted flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Nama Pelatihan</span>
                <span className="text-foreground text-sm font-medium">{entry.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Penyelenggara</span>
                <span className="text-foreground text-sm font-medium">
                  {entry.organizer || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Tahun/Periode</span>
                <span className="text-foreground text-sm font-medium">
                  {entry.period || "—"}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingId(entry.id)}
                  className="bg-background text-foreground flex-1 rounded-xl py-2.5 text-center text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={deletingId === entry.id}
                  onClick={() => handleDelete(entry.id)}
                  className="text-destructive bg-background flex-1 rounded-xl py-2.5 text-center text-sm font-medium disabled:opacity-60"
                >
                  Hapus
                </button>
              </div>
            </div>
          ),
        )}

        {adding ? (
          <EntryForm
            id={null}
            initial={EMPTY}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="bg-muted text-foreground mt-2 rounded-xl py-3.5 text-center font-medium"
          >
            + Tambah Pelatihan
          </button>
        )}
      </div>
    </div>
  );
}
