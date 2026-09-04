import Link from "next/link";
import {
  CalendarIcon as CalendarOff,
  PlusIcon as Plus,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import HolidayTable, { type HolidayRow } from "@/components/admin/HolidayTable";
import { Button } from "@/components/ui/button";
import { HolidayType, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { HOLIDAY_TYPE_LABEL, HOLIDAY_TYPE_OPTIONS } from "@/lib/holiday";
import { HolidayService } from "@/servers/services/holiday.service";

export default async function HariLiburPage() {
  await requireRole(Role.ADMIN);

  const today = getWorkDate();
  const holidays = await HolidayService.list();

  const rows: HolidayRow[] = holidays.map((holiday) => ({
    id: holiday.id,
    date: toDateInputValue(holiday.date),
    dateLabel: formatWorkDate(holiday.date),
    name: holiday.name,
    type: holiday.type,
    isPast: holiday.date.getTime() < today.getTime(),
  }));

  const thisYear = today.getUTCFullYear();
  const upcoming = holidays.filter(
    (holiday) => holiday.date.getTime() >= today.getTime(),
  ).length;
  const countByType = (type: HolidayType) =>
    holidays.filter(
      (holiday) =>
        holiday.type === type && holiday.date.getUTCFullYear() === thisYear,
    ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hari Libur"
        subtitle="Tanggal merah, cuti bersama, dan libur internal — melengkapi pola hari kerja mingguan."
        actions={
          <Button asChild>
            <Link href="/admin/hari-libur/baru">
              <Plus className="size-4" />
              Tambah Hari Libur
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Akan Datang"
          icon={CalendarOff}
          value={String(upcoming)}
          footerLabel="Terhitung dari hari ini"
        />
        {HOLIDAY_TYPE_OPTIONS.map((type) => (
          <StatTile
            key={type}
            label={HOLIDAY_TYPE_LABEL[type]}
            icon={CalendarOff}
            value={String(countByType(type))}
            footerLabel={`Sepanjang ${thisYear}`}
          />
        ))}
      </div>

      <HolidayTable rows={rows} />
    </div>
  );
}
