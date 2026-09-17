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
  type LucideIcon,
} from "lucide-react";
import { IconSquare } from "@/components/mobile/beranda/icon-square";

const MENU_ITEMS: { icon: LucideIcon; label: string; href?: string }[] = [
  { icon: CheckCheck, label: "Absensi", href: "/riwayat" },
  { icon: FileText, label: "Izin", href: "/izin" },
  { icon: Timer, label: "Lembur", href: "/lembur" },
  { icon: Briefcase, label: "Dinas Luar", href: "/dinas-luar" },
  { icon: User, label: "Profil", href: "/pengaturan" },
  { icon: Folder, label: "Dokumen", href: "/profil/data-kepegawaian/dokumen" },
  { icon: Megaphone, label: "Pengumuman" },
  { icon: Grid3x3, label: "Lainnya" },
];

/** Mirrors mobile's `MenuGrid` — 8-icon quick nav on the Beranda screen. */
export function MenuGrid() {
  return (
    <div className="flex flex-row flex-wrap">
      {MENU_ITEMS.map((item) => {
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
