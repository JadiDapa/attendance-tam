import Link from "next/link";
import { ArrowLeftIcon as ArrowLeft } from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import HolidayForm from "@/components/admin/HolidayForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";

export default async function TambahHariLiburPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/hari-libur"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Hari Libur
      </Link>

      <PageHeader
        title="Tambah Hari Libur"
        subtitle="Tambahkan tanggal merah, cuti bersama, atau libur internal baru."
      />

      <HolidayForm />
    </div>
  );
}
