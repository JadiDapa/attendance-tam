"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  FileText,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  Book,
  Image as ImageIcon,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { upsertAdministrativeDocuments } from "@/app/action/employee-profile.action";
import type { ApiAdministrativeDocument } from "@/lib/mobile-queries";

type DocumentField =
  | "ktp"
  | "npwp"
  | "kk"
  | "ijazah"
  | "transkrip"
  | "sertifikat"
  | "bankBook"
  | "pasFoto"
  | "cv";

type DocumentRow = {
  field: DocumentField;
  urlKey: keyof ApiAdministrativeDocument;
  label: string;
  optional?: boolean;
  icon: LucideIcon;
};

const DOCUMENT_ROWS: DocumentRow[] = [
  { field: "ktp", urlKey: "ktpUrl", label: "KTP", icon: CreditCard },
  {
    field: "npwp",
    urlKey: "npwpUrl",
    label: "NPWP",
    optional: true,
    icon: FileText,
  },
  { field: "kk", urlKey: "kkUrl", label: "Kartu Keluarga", icon: Users },
  {
    field: "ijazah",
    urlKey: "ijazahUrl",
    label: "Ijazah",
    icon: GraduationCap,
  },
  {
    field: "transkrip",
    urlKey: "transkripUrl",
    label: "Transkrip Nilai",
    icon: BookOpen,
  },
  {
    field: "sertifikat",
    urlKey: "sertifikatUrl",
    label: "Sertifikat",
    icon: Award,
  },
  {
    field: "bankBook",
    urlKey: "bankBookUrl",
    label: "Buku Rekening (CIMB Niaga)",
    icon: Book,
  },
  {
    field: "pasFoto",
    urlKey: "pasFotoUrl",
    label: "Pas Foto",
    icon: ImageIcon,
  },
  { field: "cv", urlKey: "cvUrl", label: "CV Terbaru", icon: Briefcase },
];

/**
 * Mirrors mobile's `employee-data-documents.tsx`, minus the download-then-share
 * dance — same-origin `<a target="_blank">` already carries the Clerk session
 * cookie, so `/api/images/[filename]` just opens directly.
 */
export function DocumentsForm({
  initial,
}: {
  initial: ApiAdministrativeDocument | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(
    null,
  );
  const fileInputRefs = useRef<
    Partial<Record<DocumentField, HTMLInputElement | null>>
  >({});

  function handleUpload(row: DocumentRow, file: File) {
    setUploadingField(row.field);
    const formData = new FormData();
    formData.append(row.field, file);

    startTransition(async () => {
      const result = await upsertAdministrativeDocuments(formData);
      setUploadingField(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Dokumen Administrasi" showBack />

      <div className="flex flex-col gap-3 p-5 pb-24">
        <p className="text-muted-foreground text-xs">
          JPG, PNG, WEBP, atau PDF, maks 5MB per dokumen. Setiap dokumen
          diunggah satu per satu.
        </p>

        {DOCUMENT_ROWS.map((row) => {
          const url = initial?.[row.urlKey] ?? null;
          const isUploading = isPending && uploadingField === row.field;

          return (
            <div
              key={row.field}
              className="bg-muted flex flex-col gap-2 rounded-2xl p-3"
            >
              <div className="flex items-center gap-3">
                <Icon
                  icon={row.icon}
                  size={20}
                  tone={url ? "success" : "muted"}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-foreground block text-sm font-medium">
                    {row.label}
                    {row.optional ? " (opsional)" : ""}
                  </span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary line-clamp-1 block text-xs underline"
                    >
                      Lihat dokumen
                    </a>
                  ) : (
                    <span className="text-muted-foreground block text-xs">
                      Belum diunggah
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRefs.current[row.field]?.click()}
                disabled={isUploading}
                className="bg-primary text-primary-foreground flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {isUploading ? "Mengunggah..." : url ? "Ganti" : "Upload"}
              </button>
              <input
                ref={(el) => {
                  fileInputRefs.current[row.field] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(row, file);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
