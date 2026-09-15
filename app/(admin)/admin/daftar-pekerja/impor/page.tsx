import Link from "next/link";
import { ArrowLeftIcon as ArrowLeft } from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import ImportEmployeesForm from "@/components/admin/ImportEmployeesForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function ImporPekerjaPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        href="/admin/daftar-pekerja"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Daftar Pekerja
      </Link>

      <PageHeader
        title="Impor Pekerja dari CSV"
        subtitle="Buat banyak akun sekaligus dari file CSV berisi Nama, Email, Nomor HP, Role, Password, dan Jabatan."
      />

      <ImportEmployeesForm />
    </div>
  );
}
