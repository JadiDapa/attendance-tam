import { KeyRound, Phone, UserRound } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import ProfileContactForm from "@/components/profile/ProfileContactForm";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/session";
import { formatWorkDate, getWorkDate } from "@/lib/date";

const ROLE_LABEL = { ADMIN: "Admin", EMPLOYEE: "Karyawan" };

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

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Profil Saya"
        subtitle="Data akun dan keamanan login."
      />

      <Panel
        title="Data Akun"
        icon={UserRound}
        action={<Badge variant="outline">{ROLE_LABEL[user.role]}</Badge>}
        contentClassName="grid gap-4 p-5 sm:grid-cols-2"
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

      <Panel title="Kontak" icon={Phone} contentClassName="p-5">
        <ProfileContactForm phone={user.phone ?? ""} />
      </Panel>

      <Panel title="Ganti Password" icon={KeyRound} contentClassName="p-5">
        <ChangePasswordForm />
      </Panel>
    </div>
  );
}
