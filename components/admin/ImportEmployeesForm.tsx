"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircledIcon as CheckCircle,
  CrossCircledIcon as XCircle,
  DownloadIcon as Download,
  UploadIcon as Upload,
} from "@radix-ui/react-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Panel from "@/components/dashboard/Panel";
import { Spinner } from "@/components/ui/spinner";
import { Role } from "@/generated/prisma";
import { ROLE_LABEL } from "@/lib/role";
import {
  employeeImportTemplateCsv,
  parseEmployeeImportRows,
  type EmployeeImportRow,
} from "@/lib/employee-import";
import { CreateUserSchema } from "@/servers/validators/user.validator";
import { importEmployees } from "@/app/action/user.action";

type PreviewRow = EmployeeImportRow & {
  /** Role dinormalisasi (trim + uppercase, kosong → EMPLOYEE) — dikirim ke server. */
  normalizedRole: string;
  error: string | null;
  /** Sudah berhasil dibuat di percobaan submit sebelumnya — dikeluarkan dari
   * pengiriman berikutnya supaya submit ulang (setelah memperbaiki baris lain
   * yang gagal) tidak mencoba membuat akun yang sama dua kali. */
  created: boolean;
};

function normalizeRow(row: EmployeeImportRow): PreviewRow {
  const normalizedRole = row.role.trim() ? row.role.trim().toUpperCase() : Role.EMPLOYEE;

  const parsed = CreateUserSchema.safeParse({
    name: row.name,
    email: row.email,
    password: row.password,
    role: normalizedRole,
    phone: row.phone,
    position: row.position,
  });

  return {
    ...row,
    normalizedRole,
    error: parsed.success ? null : (parsed.error.issues[0]?.message ?? "Data tidak valid"),
    created: false,
  };
}

function downloadTemplate() {
  const blob = new Blob([employeeImportTemplateCsv()], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-impor-pekerja.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ImportEmployeesForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(
    null,
  );

  const validRows = rows.filter((row) => !row.error && !row.created);
  const invalidCount = rows.filter((row) => row.error).length;

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSummary(null);
    setFileName(file.name);

    const text = await file.text();
    const parsedRows = parseEmployeeImportRows(text).map(normalizeRow);
    setRows(parsedRows);

    if (parsedRows.length === 0) {
      toast.error("Tidak ada baris data yang terbaca dari file ini");
    }
  };

  const onSubmit = async () => {
    if (validRows.length === 0 || submitting) return;

    setSubmitting(true);

    const { results } = await importEmployees(
      validRows.map((row) => ({
        name: row.name,
        email: row.email,
        password: row.password,
        role: row.normalizedRole,
        phone: row.phone,
        position: row.position,
      })),
    );

    setSubmitting(false);

    const created = results.filter((result) => result.ok).length;
    const failed = results.length - created;

    setSummary({ created, failed });

    // `results[i].index` mengacu ke posisi di `validRows` yang dikirim, bukan
    // `rows` asli (yang juga berisi baris tak valid) — petakan balik lewat
    // urutan baris yang sama-sama belum `created`, supaya baris yang berhasil
    // ditandai `created` (dikeluarkan dari submit berikutnya) dan yang gagal
    // dapat pesan errornya supaya admin tahu apa yang perlu diperbaiki.
    const resultByIndex = new Map(results.map((result) => [result.index, result]));

    setRows((prev) => {
      let validIndex = -1;
      return prev.map((row) => {
        if (row.error || row.created) return row;
        validIndex += 1;
        const result = resultByIndex.get(validIndex);
        if (!result) return row;
        return result.ok
          ? { ...row, created: true, error: null }
          : { ...row, error: result.message };
      });
    });

    if (failed === 0) {
      toast.success(`${created} akun pekerja berhasil dibuat`);
      router.push("/admin/daftar-pekerja");
      router.refresh();
    } else if (created > 0) {
      toast.warning(`${created} akun dibuat, ${failed} baris gagal — lihat detail di tabel`);
      router.refresh();
    } else {
      toast.error(`Semua baris gagal dibuat — lihat detail di tabel`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel title="1. Unduh Template" icon={Download} contentClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Kolom: Nama, Email, Nomor HP, Role ({Object.values(Role).join("/")}), Password,
            Jabatan. Urutan kolom bebas, header tidak case-sensitive.
          </p>
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Unduh Template CSV
          </Button>
        </div>
      </Panel>

      <Panel title="2. Unggah File CSV" icon={Upload} contentClassName="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Pilih File CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileChange}
            />
            {fileName && <span className="text-muted-foreground text-sm">{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {rows.length} baris terbaca — {validRows.length} siap diimpor
              {invalidCount > 0 && `, ${invalidCount} bermasalah`}.
            </p>
          )}
        </div>
      </Panel>

      {rows.length > 0 && (
        <Panel title="3. Pratinjau" icon={Upload} contentClassName="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nomor HP</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.name || "—"}</TableCell>
                  <TableCell>{row.email || "—"}</TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                  <TableCell>
                    {ROLE_LABEL[row.normalizedRole as Role] ?? row.normalizedRole}
                  </TableCell>
                  <TableCell>{row.position || "—"}</TableCell>
                  <TableCell>
                    {row.error ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="size-3" />
                        {row.error}
                      </Badge>
                    ) : row.created ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="size-3" />
                        Berhasil dibuat
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="size-3" />
                        Siap
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      {summary && (
        <Alert variant={summary.failed > 0 ? "destructive" : "default"}>
          <AlertTitle>
            {summary.created} akun dibuat{summary.failed > 0 && `, ${summary.failed} gagal`}
          </AlertTitle>
          {summary.failed > 0 && (
            <AlertDescription>
              Perbaiki baris yang gagal di file CSV (lihat kolom Status), lalu unggah ulang —
              baris yang sudah berhasil dibuat tidak akan dibuat dobel selama emailnya diganti
              atau dihapus dari file.
            </AlertDescription>
          )}
        </Alert>
      )}

      {rows.length > 0 && (
        <div>
          <Button type="button" onClick={onSubmit} disabled={validRows.length === 0 || submitting}>
            {submitting && <Spinner />}
            Impor {validRows.length} Pekerja
          </Button>
        </div>
      )}
    </div>
  );
}
