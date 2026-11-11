import Link from "next/link";
import { ArrowLeftIcon as ArrowLeft } from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import CreateEmployeeForm from "@/components/admin/CreateEmployeeForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { DivisionService } from "@/servers/services/division.service";

export default async function CreatePekerjaPage() {
  await requireRole(Role.ADMIN);

  const divisions = await DivisionService.list();

  const divisionOptions = divisions.map((d) => ({
    id: d.id,
    name: d.name,
    positions: d.positions.map((p) => ({
      id: p.id,
      name: p.name,
    })),
  }));

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
        title="Buat Akun Baru"
        subtitle="Nama, email, password, dan role wajib diisi. Bagian lain opsional — bisa dilengkapi sekarang atau nanti lewat halaman profil pekerja."
      />

      <CreateEmployeeForm divisions={divisionOptions} />
    </div>
  );
}
