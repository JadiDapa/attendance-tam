import {
  CheckCircle,
  FileText,
  Timer,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { Icon, type IconTone } from "@/components/mobile/icon";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import type { Role } from "@/generated/prisma";

type NotificationItem = {
  id: string;
  icon: LucideIcon;
  tone: IconTone;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// Placeholder — mirrors mobile's hardcoded data (mobile/src/app/notifications.tsx has no
// real backend for this screen either; the row rendering doesn't care about content).
const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    icon: CheckCircle,
    tone: "success",
    title: "Absensi Disetujui",
    body: "Absen luar kantor tanggal 7 Sep 2026 telah disetujui admin.",
    time: "2 jam lalu",
    read: false,
  },
  {
    id: "n2",
    icon: FileText,
    tone: "primary",
    title: "Pengajuan Izin Diproses",
    body: "Pengajuan Izin Keperluan Keluarga sedang menunggu persetujuan.",
    time: "1 hari lalu",
    read: false,
  },
  {
    id: "n3",
    icon: Timer,
    tone: "success",
    title: "Lembur Disetujui",
    body: "Pengajuan lembur tanggal 9 Sep 2026 telah disetujui.",
    time: "2 hari lalu",
    read: true,
  },
  {
    id: "n4",
    icon: Megaphone,
    tone: "muted",
    title: "Pengumuman",
    body: "Jadwal libur cuti bersama telah diperbarui, cek menu Kalender.",
    time: "4 hari lalu",
    read: true,
  },
];

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="border-border flex gap-3 border-b py-4">
      <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <Icon icon={item.icon} tone={item.tone} size={20} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-foreground line-clamp-1 flex-1 text-sm font-bold">
            {item.title}
          </span>
          {!item.read && (
            <span className="bg-primary size-2 shrink-0 rounded-full" />
          )}
        </div>
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {item.body}
        </p>
        <span className="text-muted-foreground text-xs">{item.time}</span>
      </div>
    </div>
  );
}

/** Mirrors mobile's `NotificationsScreen` — static placeholder, no real backend on either side. */
export function NotificationsScreen({ role }: { role: Role }) {
  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Notifikasi" showBack />

      <div className="flex-1 px-5 pb-24">
        {NOTIFICATIONS.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Belum ada notifikasi.
          </p>
        ) : (
          NOTIFICATIONS.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))
        )}
      </div>

      <MobileTabBar role={role} />
    </div>
  );
}
