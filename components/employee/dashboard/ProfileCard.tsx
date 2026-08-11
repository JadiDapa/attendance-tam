import { Mail, MapPin, Pencil, Phone, Clock, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  greeting: string;
  name: string;
  position: string | null;
  email: string;
  phone: string | null;
  /** Foto absensi terakhir — dipakai sebagai wajah kartu. */
  photoUrl: string | null;
  scheduleLabel: string | null;
  officeLabel: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3 py-2 text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <span className="shrink-0">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate font-semibold">{children}</span>
    </div>
  );
}

export default function ProfileCard({
  greeting,
  name,
  position,
  email,
  phone,
  photoUrl,
  scheduleLabel,
  officeLabel,
}: Props) {
  return (
    <section className="bg-card border-border rounded-2xl border p-6 shadow-xs">
      <div className="flex items-start gap-6">
        {/* Avatar with update icon */}
        <div className="relative shrink-0">
          <Avatar className="ring-muted size-24 ring-4">
            {photoUrl && <AvatarImage src={photoUrl} alt={`Foto ${name}`} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            title="Update"
            className="bg-foreground text-background absolute top-1 right-1 flex size-7 items-center justify-center rounded-full shadow-md"
          >
            <Upload className="size-3.5" />
          </button>
        </div>

        {/* Name + position + edit button */}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">{greeting},</p>
            <p className="truncate text-xl font-bold tracking-tight">{name}</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {position ?? "Karyawan"}
            </p>
          </div>
          <button
            type="button"
            className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
          >
            <Pencil className="size-3.5" />
            EDIT
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="border-border divide-border mt-5 divide-y border-t pt-2">
        <InfoRow icon={<Mail className="size-3.5" />} label="Email">
          {email}
        </InfoRow>
        {phone && (
          <InfoRow icon={<Phone className="size-3.5" />} label="Telepon">
            {phone}
          </InfoRow>
        )}
        {scheduleLabel && (
          <InfoRow icon={<Clock className="size-3.5" />} label="Jadwal">
            {scheduleLabel}
          </InfoRow>
        )}
        {officeLabel && (
          <InfoRow icon={<MapPin className="size-3.5" />} label="Kantor">
            {officeLabel}
          </InfoRow>
        )}
      </div>
    </section>
  );
}
