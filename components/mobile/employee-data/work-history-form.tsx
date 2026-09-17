"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormInput } from "@/components/mobile/form-input";
import { MobilePageHeader } from "@/components/mobile/page-header";
import {
  createWorkHistory,
  deleteWorkHistory,
  updateWorkHistory,
} from "@/app/action/employee-profile.action";
import type { ApiWorkHistory } from "@/lib/mobile-queries";

type FormState = {
  previousCompany: string;
  previousPosition: string;
  previousDuration: string;
};

const EMPTY: FormState = {
  previousCompany: "",
  previousPosition: "",
  previousDuration: "",
};

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
      const result = id
        ? await updateWorkHistory(id, form)
        : await createWorkHistory(form);
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
        <span className="text-foreground text-sm font-medium">
          Perusahaan Sebelumnya
        </span>
        <FormInput
          value={form.previousCompany}
          onChange={(e) => setForm({ ...form, previousCompany: e.target.value })}
          placeholder="Contoh: PT Sejahtera Abadi"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-foreground text-sm font-medium">
          Posisi Sebelumnya
        </span>
        <FormInput
          value={form.previousPosition}
          onChange={(e) => setForm({ ...form, previousPosition: e.target.value })}
          placeholder="Contoh: Staff Administrasi"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-foreground text-sm font-medium">Lama Bekerja</span>
        <FormInput
          value={form.previousDuration}
          onChange={(e) => setForm({ ...form, previousDuration: e.target.value })}
          placeholder="Contoh: 2 tahun 3 bulan"
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

/** Mirrors mobile's `employee-data-work-history.tsx` — list + add/edit/delete, all fields optional. */
export function WorkHistoryForm({ initial }: { initial: ApiWorkHistory[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus riwayat pekerjaan ini?")) return;

    setDeletingId(id);
    const result = await deleteWorkHistory(id);
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
      <MobilePageHeader title="Riwayat Pekerjaan" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <span className="text-muted-foreground text-xs">
          Opsional — tambahkan riwayat pekerjaan sebelumnya sebanyak yang perlu.
        </span>

        {initial.length === 0 && !adding && (
          <p className="text-muted-foreground text-sm">Belum ada riwayat pekerjaan.</p>
        )}

        {initial.map((entry) =>
          editingId === entry.id ? (
            <EntryForm
              key={entry.id}
              id={entry.id}
              initial={{
                previousCompany: entry.previousCompany ?? "",
                previousPosition: entry.previousPosition ?? "",
                previousDuration: entry.previousDuration ?? "",
              }}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={entry.id} className="bg-muted flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Perusahaan</span>
                <span className="text-foreground text-sm font-medium">
                  {entry.previousCompany || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Posisi</span>
                <span className="text-foreground text-sm font-medium">
                  {entry.previousPosition || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Lama Bekerja</span>
                <span className="text-foreground text-sm font-medium">
                  {entry.previousDuration || "—"}
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
            + Tambah Riwayat Pekerjaan
          </button>
        )}
      </div>
    </div>
  );
}
