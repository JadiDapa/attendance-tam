import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArchiveIcon as Archive,
  ArrowLeftIcon as ArrowLeft,
  BackpackIcon as Backpack,
  CardStackIcon as CardStack,
  IdCardIcon as IdCard,
  ReaderIcon as Reader,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EditEmployeeAccountForm from "@/components/admin/EditEmployeeAccountForm";
import PersonalIdentityForm from "@/components/profile/PersonalIdentityForm";
import ContactForm from "@/components/profile/ContactForm";
import EmploymentDataForm from "@/components/profile/EmploymentDataForm";
import WorkHistoryForm from "@/components/profile/WorkHistoryForm";
import AdministrativeDocumentsForm from "@/components/profile/AdministrativeDocumentsForm";
import PayrollForm from "@/components/profile/PayrollForm";
import TrainingForm from "@/components/profile/TrainingForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { toDateInputValue } from "@/lib/date";
import { UserService } from "@/servers/services/user.service";
import {
  AdministrativeDocumentService,
  ContactService,
  EmploymentDataService,
  PayrollService,
  PersonalIdentityService,
  TrainingService,
  WorkHistoryService,
} from "@/servers/services/employee-profile.service";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function EditEmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        href={`/admin/daftar-pekerja/${id}`}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Profil {employee.name}
      </Link>

      <PageHeader
        title={`Edit ${employee.name}`}
        subtitle="Setiap bagian tersimpan sendiri-sendiri — klik Simpan di tiap bagian yang diubah."
      />

      <Panel title="Data Akun" icon={IdCard} contentClassName="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar size="lg">
            {employee.profileImageUrl && (
              <AvatarImage
                src={employee.profileImageUrl}
                alt={`Foto ${employee.name}`}
              />
            )}
            <AvatarFallback>{initials(employee.name)}</AvatarFallback>
          </Avatar>
        </div>
        <EditEmployeeAccountForm
          employee={{
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            phone: employee.phone ?? "",
            position: employee.position ?? "",
          }}
        />
      </Panel>

      <Panel
        title="Identitas Pribadi"
        icon={IdCard}
        contentClassName="p-4 sm:p-5"
      >
        <PersonalIdentityForm
          targetUserId={id}
          initial={{
            nik: personalIdentity?.nik ?? "",
            placeOfBirth: personalIdentity?.placeOfBirth ?? "",
            dateOfBirth: personalIdentity
              ? toDateInputValue(personalIdentity.dateOfBirth)
              : "",
            gender: personalIdentity?.gender ?? "",
            religion: personalIdentity?.religion ?? "",
            maritalStatus: personalIdentity?.maritalStatus ?? "",
            nationality: personalIdentity?.nationality ?? "Indonesia",
            ktpPhotoUrl: personalIdentity?.ktpPhotoUrl ?? null,
          }}
        />
      </Panel>

      <Panel
        title="Kontak Domisili & Darurat"
        icon={Backpack}
        contentClassName="p-4 sm:p-5"
      >
        <ContactForm
          targetUserId={id}
          initial={{
            domicileAddress: contact?.domicileAddress ?? "",
            ktpAddress: contact?.ktpAddress ?? "",
            emergencyContactName: contact?.emergencyContactName ?? "",
            emergencyContactRelation: contact?.emergencyContactRelation ?? "",
            emergencyContactPhone: contact?.emergencyContactPhone ?? "",
          }}
        />
      </Panel>

      <Panel
        title="Data Kepegawaian"
        icon={CardStack}
        contentClassName="p-4 sm:p-5"
      >
        <EmploymentDataForm
          targetUserId={id}
          initial={{
            employeeNumber: employmentData?.employeeNumber ?? "",
            workLocation: employmentData?.workLocation ?? "",
            employmentStatus: employmentData?.employmentStatus ?? "",
            startDate: employmentData
              ? toDateInputValue(employmentData.startDate)
              : "",
            contractEndDate: employmentData?.contractEndDate
              ? toDateInputValue(employmentData.contractEndDate)
              : "",
          }}
        />
      </Panel>

      <Panel
        title="Riwayat Pekerjaan"
        icon={Archive}
        contentClassName="p-4 sm:p-5"
      >
        <WorkHistoryForm
          targetUserId={id}
          initial={{
            previousCompany: workHistory?.previousCompany ?? "",
            previousPosition: workHistory?.previousPosition ?? "",
            previousDuration: workHistory?.previousDuration ?? "",
          }}
        />
      </Panel>

      <Panel
        title="Dokumen Administrasi"
        icon={Archive}
        contentClassName="p-4 sm:p-5"
      >
        <AdministrativeDocumentsForm
          targetUserId={id}
          initial={{
            ktpUrl: administrativeDocument?.ktpUrl ?? null,
            npwpUrl: administrativeDocument?.npwpUrl ?? null,
            kkUrl: administrativeDocument?.kkUrl ?? null,
            ijazahUrl: administrativeDocument?.ijazahUrl ?? null,
            transkripUrl: administrativeDocument?.transkripUrl ?? null,
            sertifikatUrl: administrativeDocument?.sertifikatUrl ?? null,
            bankBookUrl: administrativeDocument?.bankBookUrl ?? null,
            pasFotoUrl: administrativeDocument?.pasFotoUrl ?? null,
            cvUrl: administrativeDocument?.cvUrl ?? null,
          }}
        />
      </Panel>

      <Panel title="Penggajian" icon={CardStack} contentClassName="p-4 sm:p-5">
        <PayrollForm
          targetUserId={id}
          initial={{
            baseSalary: payroll?.baseSalary ?? "",
            allowance: payroll?.allowance ?? "",
            bonus: payroll?.bonus ?? "",
            bankAccountNumber: payroll?.bankAccountNumber ?? "",
            bankAccountName: payroll?.bankAccountName ?? "",
            bpjsKesehatanNumber: payroll?.bpjsKesehatanNumber ?? "",
            bpjsKetenagakerjaanNumber:
              payroll?.bpjsKetenagakerjaanNumber ?? "",
          }}
        />
      </Panel>

      <Panel title="Pelatihan" icon={Reader} contentClassName="p-4 sm:p-5">
        <TrainingForm
          targetUserId={id}
          initial={{ trainingHistory: training?.trainingHistory ?? "" }}
        />
      </Panel>
    </div>
  );
}
