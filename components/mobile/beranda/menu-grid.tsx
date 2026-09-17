import Link from "next/link";
import {
  CheckCheck,
  FileText,
  Timer,
  Briefcase,
  User,
  Folder,
  Megaphone,
  Grid3x3,
  CalendarCheck,
  ShieldCheck,
  ClipboardCheck,
  ClockAlert,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { IconSquare } from "@/components/mobile/beranda/icon-square";
import type { Role } from "@/generated/prisma";

const BASE_ITEMS: { icon: LucideIcon; label: string; href?: string }[] = [
  { icon: CheckCheck, label: "Absensi", href: "/riwayat" },
  { icon: FileText, label: "Izin", href: "/izin" },
  { icon: Timer, label: "Lembur", href: "/lembur" },
  { icon: Briefcase, label: "Dinas Luar", href: "/dinas-luar" },
  { icon: User, label: "Profil", href: "/pengaturan" },
  { icon: Folder, label: "Dokumen", href: "/profil/data-kepegawaian/dokumen" },
  { icon: Megaphone, label: "Pengumuman" },
];

/**
 * ADMIN has no equivalent role in the RN app, so the mobile-parity build has
 * no tab for the admin-only sidebar pages (see MOBILE_PARITY.md). Daily-use
 * ones are surfaced here, inserted before "Lainnya"; less-frequent
 * config/report pages go on the Profile page instead. Links go straight to
 * the existing responsive desktop page — no RN screen exists to clone here.
 */
const ADMIN_ITEMS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: CalendarCheck, label: "Kehadiran", href: "/admin/kehadiran" },
  { icon: ShieldCheck, label: "Verifikasi Absensi", href: "/admin/verifikasi" },
  { icon: ClipboardCheck, label: "Pengajuan Izin", href: "/admin/izin" },
  { icon: ClockAlert, label: "Pengajuan Lembur", href: "/admin/lembur" },
  { icon: Briefcase, label: "Dinas Luar", href: "/admin/dinas-luar" },
  { icon: UserPlus, label: "Permintaan Akun", href: "/admin/permintaan-akun" },
];

const LAINNYA_ITEM: { icon: LucideIcon; label: string; href?: string } = {
  icon: Grid3x3,
  label: "Lainnya",
};

/** Mirrors mobile's `MenuGrid` — 8-icon quick nav on the Beranda screen, extended with an ADMIN-only row. */
export function MenuGrid({ role }: { role: Role }) {
  const items = [
    ...BASE_ITEMS,
    ...(role === "ADMIN" ? ADMIN_ITEMS : []),
    LAINNYA_ITEM,
  ];

  return (
    <div className="flex flex-row flex-wrap">
      {items.map((item) => {
        const content = (
          <>
            <IconSquare icon={item.icon} />
            <span className="text-muted-foreground line-clamp-1 text-center text-xs font-medium">
              {item.label}
            </span>
          </>
        );

        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="flex w-1/4 flex-col items-center gap-2 py-2"
          >
            {content}
          </Link>
        ) : (
          <div
            key={item.label}
            className="flex w-1/4 flex-col items-center gap-2 py-2 opacity-60"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
