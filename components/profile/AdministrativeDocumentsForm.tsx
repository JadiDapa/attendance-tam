"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { upsertAdministrativeDocuments } from "@/app/action/employee-profile.action";

type DocumentField = {
  field: string;
  label: string;
};

/** Satu field per submit — tetap di bawah batas ukuran body request. */
const DOCUMENT_FIELDS: DocumentField[] = [
  { field: "ktp", label: "KTP" },
  { field: "npwp", label: "NPWP (opsional)" },
  { field: "kk", label: "Kartu Keluarga (KK)" },
  { field: "ijazah", label: "Ijazah" },
  { field: "transkrip", label: "Transkrip Nilai" },
  { field: "sertifikat", label: "Sertifikat" },
  { field: "bankBook", label: "Buku Rekening Bank (CIMB Niaga)" },
  { field: "pasFoto", label: "Pas Foto" },
  { field: "cv", label: "CV Terbaru" },
];

type Props = {
  initial: Record<string, string | null>;
  targetUserId?: string;
};

function UploadRow({
  field,
  label,
  currentUrl,
  targetUserId,
}: {
  field: string;
  label: string;
  currentUrl: string | null;
  targetUserId?: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Pilih berkas terlebih dahulu");
      return;
    }

    setPending(true);

    const formData = new FormData();
    formData.set(field, file);
    if (targetUserId) formData.set("targetUserId", targetUserId);

    const result = await upsertAdministrativeDocuments(formData);

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setFile(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor={`doc-${field}`}>{label}</Label>
        <Input
          id={`doc-${field}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {currentUrl && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary w-fit text-xs underline"
          >
            Lihat berkas saat ini
          </a>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending || !file}
        onClick={handleUpload}
      >
        {pending && <Spinner />}
        Unggah
      </Button>
    </div>
  );
}

/**
 * Sembilan dokumen, masing-masing dengan input file + tombol unggah sendiri —
 * sengaja tidak digabung jadi satu form supaya tidak ada request yang
 * mengirim banyak file sekaligus (lihat batas `bodySizeLimit` di next.config.ts).
 */
export default function AdministrativeDocumentsForm({ initial, targetUserId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-xs">
        JPG, PNG, WEBP, atau PDF, maks 5MB per berkas. Unggah satu per satu —
        semua field opsional dan bisa diisi bertahap.
      </p>

      {DOCUMENT_FIELDS.map(({ field, label }) => (
        <UploadRow
          key={field}
          field={field}
          label={label}
          currentUrl={initial[`${field}Url`] ?? null}
          targetUserId={targetUserId}
        />
      ))}
    </div>
  );
}
