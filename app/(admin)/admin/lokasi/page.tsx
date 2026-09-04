import PageHeader from "@/components/dashboard/PageHeader";
import OfficeLocationForm from "@/components/admin/OfficeLocationForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { OfficeLocationService } from "@/servers/services/setting.service";

export default async function LokasiPage() {
  await requireRole(Role.ADMIN);

  const office = await OfficeLocationService.getActive();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lokasi Kantor"
        subtitle="Titik pusat kantor dan radius yang dipakai untuk memvalidasi absensi karyawan."
      />

      <OfficeLocationForm
        defaultValues={{
          // Default Monas — biar peta tidak terbuka di tengah laut (0,0).
          name: office?.name ?? "Kantor Pusat",
          latitude: office?.latitude ?? -6.1753924,
          longitude: office?.longitude ?? 106.8271528,
          radiusMeters: office?.radiusMeters ?? 100,
        }}
      />
    </div>
  );
}
