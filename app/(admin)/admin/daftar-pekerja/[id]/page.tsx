import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArchiveIcon as Archive,
  ArrowLeftIcon as ArrowLeft,
  BackpackIcon as Backpack,
  CalendarIcon as CalendarRange,
  CardStackIcon as CardStack,
  IdCardIcon as IdCard,
  Pencil2Icon as Pencil,
  ReaderIcon as Reader,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import DateRangeNav from "@/components/dashboard/DateRangeNav";
import AttendanceCalendar from "@/components/employee/attendance/AttendanceCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmployeeStatusToggle from "@/components/admin/EmployeeStatusToggle";
import PayrollView from "@/components/profile/PayrollView";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/role";
import {
  EMPLOYMENT_STATUS_LABEL,
  GENDER_LABEL,
  MARITAL_STATUS_LABEL,
  RELIGION_LABEL,
} from "@/lib/employee-profile";
import {
  formatCompactDate,
  formatWorkDate,
  getWorkDate,
  toDateInputValue,
} from "@/lib/date";
import {
  buildAttendanceDays,
  groupDaysByMonth,
  resolveAttendanceRange,
} from "@/lib/attendance-days";
import { UserService } from "@/servers/services/user.service";
import { ReportService } from "@/servers/services/report.service";
import {
  AdministrativeDocumentService,
  ContactService,
  EmploymentDataService,
  PayrollService,
  PersonalIdentityService,
  TrainingService,
  WorkHistoryService,
} from "@/servers/services/employee-profile.service";

type SearchParams = { start?: string; end?: string };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptySection({ children }: { children: string }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

const DOCUMENT_FIELDS: { key: string; label: string }[] = [
  { key: "ktpUrl", label: "KTP" },
  { key: "npwpUrl", label: "NPWP" },
  { key: "kkUrl", label: "Kartu Keluarga (KK)" },
  { key: "ijazahUrl", label: "Ijazah" },
  { key: "transkripUrl", label: "Transkrip Nilai" },
  { key: "sertifikatUrl", label: "Sertifikat" },
  { key: "bankBookUrl", label: "Buku Rekening Bank" },
  { key: "pasFotoUrl", label: "Pas Foto" },
  { key: "cvUrl", label: "CV Terbaru" },
];

export default async function EmployeeProfileDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const { id } = await params;
  const employee = await UserService.getById(id);

  if (!employee) notFound();

  const [
    personalIdentity,
    contact,
    employmentData,
    workHistory,
    administrativeDocument,
    payroll,
    training,
  ] = await Promise.all([
    PersonalIdentityService.getByUserId(id),
    ContactService.getByUserId(id),
    EmploymentDataService.getByUserId(id),
    WorkHistoryService.getByUserId(id),
    AdministrativeDocumentService.getByUserId(id),
    PayrollService.getByUserId(id),
    TrainingService.getByUserId(id),
  ]);

  const today = getWorkDate();
  const range = resolveAttendanceRange(await searchParams, today);

  const days = buildAttendanceDays({
    rows: await ReportService.buildRecap({
      startDate: range.startDate,
      endDate: range.endDate,
      userId: id,
    }),
    startDate: range.startDate,
    endDate: range.endDate,
    today,
  });

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
        title={employee.name}
        subtitle="Profil, data kepegawaian, dan kehadiran pekerja ini."
        actions={
          <>
            <Badge variant="outline">{ROLE_LABEL[employee.role]}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/daftar-pekerja/${id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <EmployeeStatusToggle employee={employee} label />
          </>
        }
      />

      <Panel
        title="Data Akun"
        icon={IdCard}
        contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
      >
        <Field label="Nama" value={employee.name} />
        <Field label="Email" value={employee.email} />
        <Field label="Jabatan" value={employee.position || "—"} />
        <Field label="Nomor HP" value={employee.phone || "—"} />
        <Field
          label="Terdaftar sejak"
          value={formatWorkDate(getWorkDate(employee.createdAt))}
        />
        <Field
          label="Status"
          value={employee.isActive ? "Aktif" : "Nonaktif"}
        />
      </Panel>

      <Panel
        title="Kalender Kehadiran"
        icon={CalendarRange}
        action={
          <DateRangeNav
            start={toDateInputValue(range.startDate)}
            end={toDateInputValue(range.endDate)}
            today={toDateInputValue(today)}
            label={`${formatCompactDate(range.startDate)} to ${formatCompactDate(range.endDate)}`}
            basePath={`/admin/daftar-pekerja/${id}`}
          />
        }
        contentClassName="p-4 sm:p-5"
      >
        {range.error && (
          <p className="text-destructive mb-3 text-sm">
            {range.error} — menampilkan bulan ini.
          </p>
        )}
        <AttendanceCalendar months={groupDaysByMonth(days)} />
      </Panel>

      <Panel
        title="Identitas Pribadi"
        icon={IdCard}
        contentClassName="p-4 sm:p-5"
      >
        {personalIdentity ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NIK" value={personalIdentity.nik} />
            <Field
              label="Tempat, Tanggal Lahir"
              value={`${personalIdentity.placeOfBirth}, ${formatWorkDate(personalIdentity.dateOfBirth)}`}
            />
            <Field
              label="Jenis Kelamin"
              value={GENDER_LABEL[personalIdentity.gender]}
            />
            <Field
              label="Agama"
              value={RELIGION_LABEL[personalIdentity.religion]}
            />
            <Field
              label="Status Perkawinan"
              value={MARITAL_STATUS_LABEL[personalIdentity.maritalStatus]}
            />
            <Field
              label="Kewarganegaraan"
              value={personalIdentity.nationality}
            />
            {personalIdentity.ktpPhotoUrl && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Foto KTP
                </p>
                <a
                  href={personalIdentity.ktpPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary w-fit text-sm underline"
                >
                  Lihat foto KTP
                </a>
              </div>
            )}
          </div>
        ) : (
          <EmptySection>Belum diisi.</EmptySection>
        )}
      </Panel>

      <Panel
        title="Kontak Domisili & Darurat"
        icon={Backpack}
        contentClassName="p-4 sm:p-5"
      >
        {contact ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alamat Domisili" value={contact.domicileAddress} />
            <Field label="Alamat KTP" value={contact.ktpAddress} />
            <Field
              label="Kontak Darurat"
              value={`${contact.emergencyContactName} (${contact.emergencyContactRelation})`}
            />
            <Field
              label="Nomor Telepon Darurat"
              value={contact.emergencyContactPhone}
            />
          </div>
        ) : (
          <EmptySection>Belum diisi.</EmptySection>
        )}
      </Panel>

      <Panel
        title="Data Kepegawaian"
        icon={CardStack}
        contentClassName="p-4 sm:p-5"
      >
        {employmentData ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nomor Induk Pegawai"
              value={employmentData.employeeNumber}
            />
            <Field label="Lokasi Kerja" value={employmentData.workLocation} />
            <Field
              label="Status Karyawan"
              value={EMPLOYMENT_STATUS_LABEL[employmentData.employmentStatus]}
            />
            <Field
              label="Tanggal Masuk"
              value={formatWorkDate(employmentData.startDate)}
            />
            <Field
              label="Tanggal Berakhir Kontrak"
              value={
                employmentData.contractEndDate
                  ? formatWorkDate(employmentData.contractEndDate)
                  : "—"
              }
            />
          </div>
        ) : (
          <EmptySection>Belum diisi.</EmptySection>
        )}
      </Panel>

      <Panel
        title="Riwayat Pekerjaan"
        icon={Archive}
        contentClassName="p-4 sm:p-5"
      >
        {workHistory &&
        (workHistory.previousCompany ||
          workHistory.previousPosition ||
          workHistory.previousDuration) ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Perusahaan Sebelumnya"
              value={workHistory.previousCompany || "—"}
            />
            <Field
              label="Posisi Sebelumnya"
              value={workHistory.previousPosition || "—"}
            />
            <Field
              label="Lama Bekerja"
              value={workHistory.previousDuration || "—"}
            />
          </div>
        ) : (
          <EmptySection>Belum diisi.</EmptySection>
        )}
      </Panel>

      <Panel
        title="Dokumen Administrasi"
        icon={Archive}
        contentClassName="p-4 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCUMENT_FIELDS.map(({ key, label }) => {
            const url = administrativeDocument?.[
              key as keyof typeof administrativeDocument
            ] as string | null | undefined;

            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-sm">{label}</span>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs underline"
                  >
                    Lihat berkas
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Belum diunggah
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Penggajian" icon={CardStack} contentClassName="p-4 sm:p-5">
        <PayrollView payroll={payroll} />
      </Panel>

      <Panel title="Pelatihan" icon={Reader} contentClassName="p-4 sm:p-5">
        {training?.trainingHistory ? (
          <p className="text-sm whitespace-pre-line">
            {training.trainingHistory}
          </p>
        ) : (
          <EmptySection>Belum diisi.</EmptySection>
        )}
      </Panel>
    </div>
  );
}
