import {
  ArchiveIcon as Archive,
  BackpackIcon as Backpack,
  CardStackIcon as CardStack,
  IdCardIcon as IdCard,
  LockClosedIcon as KeyRound,
  MobileIcon as Phone,
  ReaderIcon as Reader,
  FaceIcon as ScanFace,
  PersonIcon as UserRound,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import ProfileContactForm from "@/components/profile/ProfileContactForm";
import FaceEnrollmentCard from "@/components/profile/FaceEnrollmentCard";
import PersonalIdentityForm from "@/components/profile/PersonalIdentityForm";
import ContactForm from "@/components/profile/ContactForm";
import EmploymentDataForm from "@/components/profile/EmploymentDataForm";
import WorkHistoryForm from "@/components/profile/WorkHistoryForm";
import AdministrativeDocumentsForm from "@/components/profile/AdministrativeDocumentsForm";
import TrainingForm from "@/components/profile/TrainingForm";
import PayrollView from "@/components/profile/PayrollView";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/role";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { FaceService } from "@/servers/services/face.service";
import {
  AdministrativeDocumentService,
  ContactService,
  EmploymentDataService,
  PayrollService,
  PersonalIdentityService,
  TrainingService,
  WorkHistoryService,
} from "@/servers/services/employee-profile.service";

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

export default async function ProfilPage() {
  const user = await requireUser();

  const [
    totalPhotos,
    personalIdentity,
    contact,
    employmentData,
    workHistory,
    administrativeDocument,
    payroll,
    training,
  ] = await Promise.all([
    FaceService.countByUser(user.id),
    PersonalIdentityService.getByUserId(user.id),
    ContactService.getByUserId(user.id),
    EmploymentDataService.getByUserId(user.id),
    WorkHistoryService.getByUserId(user.id),
    AdministrativeDocumentService.getByUserId(user.id),
    PayrollService.getByUserId(user.id),
    TrainingService.getByUserId(user.id),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Profil Saya"
        subtitle="Data akun, data pribadi, kepegawaian, dan keamanan login."
      />

      <Panel
        title="Data Akun"
        icon={UserRound}
        action={<Badge variant="outline">{ROLE_LABEL[user.role]}</Badge>}
        contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
      >
        <Field label="Nama" value={user.name} />
        <Field label="Email" value={user.email} />
        <Field label="Jabatan" value={user.position || "—"} />
        <Field
          label="Terdaftar sejak"
          value={formatWorkDate(getWorkDate(user.createdAt))}
        />

        <p className="text-muted-foreground text-xs sm:col-span-2">
          Nama, email, dan jabatan dipakai di rekap serta laporan absensi, jadi
          hanya admin yang bisa mengubahnya.
        </p>
      </Panel>

      <Panel title="Kontak" icon={Phone} contentClassName="p-4 sm:p-5">
        <ProfileContactForm phone={user.phone ?? ""} />
      </Panel>

      <Panel
        title="Identitas Pribadi"
        icon={IdCard}
        contentClassName="p-4 sm:p-5"
      >
        <PersonalIdentityForm
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

      <Panel
        title="Penggajian"
        icon={CardStack}
        contentClassName="p-4 sm:p-5"
      >
        <PayrollView payroll={payroll} />
      </Panel>

      <Panel title="Pelatihan" icon={Reader} contentClassName="p-4 sm:p-5">
        <TrainingForm
          initial={{ trainingHistory: training?.trainingHistory ?? "" }}
        />
      </Panel>

      <Panel
        title="Pendaftaran Wajah"
        icon={ScanFace}
        contentClassName="p-4 sm:p-5"
      >
        <FaceEnrollmentCard
          totalPhotos={totalPhotos}
          minRequired={FaceService.minEnrollmentPhotos}
          recommendedPhotos={FaceService.recommendedEnrollmentPhotos}
          maxPhotos={FaceService.maxEnrollmentPhotos}
        />
      </Panel>

      <Panel
        title="Ganti Password"
        icon={KeyRound}
        contentClassName="p-4 sm:p-5"
      >
        <ChangePasswordForm />
      </Panel>
    </div>
  );
}
