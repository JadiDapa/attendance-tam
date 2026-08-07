import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="text-muted-foreground flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
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
    <section className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-5 shadow-xs">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {photoUrl && <AvatarImage src={photoUrl} alt={`Foto ${name}`} />}
          <AvatarFallback className="text-lg font-semibold">
            {initials(name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{greeting},</p>
          <p className="truncate text-lg font-bold tracking-tight">{name}</p>
          {position ? (
            <Badge variant="secondary" className="mt-1">
              {position}
            </Badge>
          ) : (
            <Badge variant="outline" className="mt-1">
              Karyawan
            </Badge>
          )}
        </div>
      </div>

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <InfoRow icon={<Mail className="size-4" />}>{email}</InfoRow>
        {phone && <InfoRow icon={<Phone className="size-4" />}>{phone}</InfoRow>}
        {scheduleLabel && (
          <InfoRow icon={<Clock className="size-4" />}>{scheduleLabel}</InfoRow>
        )}
        {officeLabel && (
          <InfoRow icon={<MapPin className="size-4" />}>{officeLabel}</InfoRow>
        )}
      </div>
    </section>
  );
}
