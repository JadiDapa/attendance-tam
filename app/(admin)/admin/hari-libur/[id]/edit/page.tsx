import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon as ArrowLeft } from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import HolidayForm from "@/components/admin/HolidayForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { toDateInputValue } from "@/lib/date";
import { HolidayService } from "@/servers/services/holiday.service";

export default async function EditHariLiburPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN);

  const { id } = await params;
  const holiday = await HolidayService.getById(id);

  if (!holiday) notFound();

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
        title="Ubah Hari Libur"
        subtitle={`Perbarui detail untuk ${holiday.name}.`}
      />

      <HolidayForm
        holiday={{
          id: holiday.id,
          date: toDateInputValue(holiday.date),
          name: holiday.name,
          type: holiday.type,
        }}
      />
    </div>
  );
}
