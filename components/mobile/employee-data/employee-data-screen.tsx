"use client";

import { useRouter } from "next/navigation";
import {
  FingerprintPattern,
  Phone,
  Briefcase,
  History,
  Paperclip,
  GraduationCap,
  Banknote,
  PlusCircle,
  Gift,
  CreditCard,
  Stethoscope,
  ShieldCheck,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { SimpleRow } from "@/components/mobile/simple-row";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { GENDER_LABEL, EMPLOYMENT_STATUS_LABEL } from "@/lib/employee-profile";
import { useProfileDataQuery } from "@/lib/mobile-queries";
import type { Role } from "@/generated/prisma";
import type { Gender, EmploymentStatus } from "@/generated/prisma";

const DOCUMENT_URL_FIELDS = [
  "ktpUrl",
  "npwpUrl",
  "kkUrl",
  "ijazahUrl",
  "transkripUrl",
  "sertifikatUrl",
  "bankBookUrl",
  "pasFotoUrl",
  "cvUrl",
] as const;

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function PayrollRow({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon icon={icon} size={18} tone="muted" />
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-xs">{label}</span>
        <span className="text-foreground block text-sm font-medium">
          {value}
        </span>
      </div>
    </div>
  );
}

/** Mirrors mobile's `EmployeeDataScreen` — hub linking to 6 sub-forms + read-only payroll. */
export function EmployeeDataScreen({ role }: { role: Role }) {
  const router = useRouter();
  const profile = useProfileDataQuery();

  const shell = (children: React.ReactNode) => (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Data Kepegawaian" showBack />
      {children}
      <MobileTabBar role={role} />
    </div>
  );

  if (profile.isPending) {
    return shell(
      <div className="flex flex-1 items-center justify-center">
        <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
      </div>,
    );
  }

  if (profile.isError || !profile.data) {
    return shell(
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-muted-foreground text-center">
          Gagal memuat data karyawan.
        </p>
        <button
          type="button"
          onClick={() => profile.refetch()}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-3"
        >
          Coba Lagi
        </button>
      </div>,
    );
  }

  const data = profile.data;

  const identitySubtitle = data.personalIdentity
    ? `NIK ${data.personalIdentity.nik} · ${GENDER_LABEL[data.personalIdentity.gender as Gender]}`
    : "Belum diisi";

  const contactSubtitle = data.contact
    ? data.contact.domicileAddress
    : "Belum diisi";

  const employmentSubtitle = data.employmentData
    ? `${data.employmentData.employeeNumber} · ${EMPLOYMENT_STATUS_LABEL[data.employmentData.employmentStatus as EmploymentStatus]}`
    : "Belum diisi";

  const workHistorySubtitle =
    data.workHistory.length > 0
      ? `${data.workHistory.length} riwayat pekerjaan`
      : "Belum diisi";

  const uploadedDocumentCount = data.administrativeDocument
    ? DOCUMENT_URL_FIELDS.filter((field) =>
        Boolean(data.administrativeDocument![field]),
      ).length
    : 0;
  const documentsSubtitle = `${uploadedDocumentCount}/${DOCUMENT_URL_FIELDS.length} dokumen terunggah`;

  const trainingSubtitle =
    data.training.length > 0
      ? `${data.training.length} pelatihan`
      : "Belum diisi";

  return shell(
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-bold">
            Data Kepegawaian
          </span>
          <div className="bg-muted rounded-2xl px-3">
            <SimpleRow
              icon={FingerprintPattern}
              label="Identitas Pribadi"
              subtitle={identitySubtitle}
              onPress={() => router.push("/profil/data-kepegawaian/identitas")}
              showBorder
            />
            <SimpleRow
              icon={Phone}
              label="Kontak"
              subtitle={contactSubtitle}
              onPress={() => router.push("/profil/data-kepegawaian/kontak")}
              showBorder
            />
            <SimpleRow
              icon={Briefcase}
              label="Data Kepegawaian"
              subtitle={employmentSubtitle}
              onPress={() =>
                router.push("/profil/data-kepegawaian/kepegawaian")
              }
              showBorder
            />
            <SimpleRow
              icon={History}
              label="Riwayat Pekerjaan"
              subtitle={workHistorySubtitle}
              onPress={() =>
                router.push("/profil/data-kepegawaian/riwayat-kerja")
              }
              showBorder
            />
            <SimpleRow
              icon={Paperclip}
              label="Dokumen Administrasi"
              subtitle={documentsSubtitle}
              onPress={() => router.push("/profil/data-kepegawaian/dokumen")}
              showBorder
            />
            <SimpleRow
              icon={GraduationCap}
              label="Pelatihan"
              subtitle={trainingSubtitle}
              onPress={() => router.push("/profil/data-kepegawaian/pelatihan")}
              showBorder={false}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-bold">Penggajian</span>
          <div className="bg-muted rounded-2xl p-3">
            {data.payroll ? (
              <div>
                <PayrollRow
                  icon={Banknote}
                  label="Gaji Pokok"
                  value={formatRupiah(data.payroll.baseSalary)}
                />
                <PayrollRow
                  icon={PlusCircle}
                  label="Tunjangan"
                  value={
                    data.payroll.allowance != null
                      ? formatRupiah(data.payroll.allowance)
                      : "-"
                  }
                />
                <PayrollRow
                  icon={Gift}
                  label="Bonus"
                  value={
                    data.payroll.bonus != null
                      ? formatRupiah(data.payroll.bonus)
                      : "-"
                  }
                />
                <PayrollRow
                  icon={CreditCard}
                  label="Rekening Bank"
                  value={`${data.payroll.bankAccountName} · ${data.payroll.bankAccountNumber}`}
                />
                <PayrollRow
                  icon={Stethoscope}
                  label="BPJS Kesehatan"
                  value={data.payroll.bpjsKesehatanNumber ?? "-"}
                />
                <PayrollRow
                  icon={ShieldCheck}
                  label="BPJS Ketenagakerjaan"
                  value={data.payroll.bpjsKetenagakerjaanNumber ?? "-"}
                />
              </div>
            ) : (
              <p className="text-muted-foreground py-2 text-sm">Belum diisi</p>
            )}
            <div className="border-border mt-1 flex items-center gap-2 border-t pt-3">
              <Icon icon={Lock} size={14} tone="muted" />
              <span className="text-muted-foreground flex-1 text-xs">
                Hanya admin yang bisa mengubah data ini.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
  );
}
