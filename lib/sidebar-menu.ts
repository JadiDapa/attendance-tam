import type { ComponentType } from "react";
import {
  DashboardIcon as LayoutDashboard,
  CalendarIcon as CalendarCheck,
  CalendarIcon as CalendarClock,
  CalendarIcon as CalendarOff,
  FileTextIcon as FileText,
  AvatarIcon as Users,
  SewingPinIcon as MapPin,
  ClipboardIcon as ClipboardCheck,
  ClockIcon as Clock,
  DownloadIcon as Download,
  BadgeIcon as ShieldCheck,
  GearIcon as Settings,
} from "@radix-ui/react-icons";

type Icon = ComponentType<{ className?: string }>;

export type MenuItem = {
  title: string;
  url: string;
  icon: Icon;
  roles?: string[];
  submenu?: { title: string; url: string }[];
};

export const overviewItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["EMPLOYEE"],
  },
  {
    title: "Riwayat Absensi",
    url: "/riwayat",
    icon: CalendarClock,
    roles: ["EMPLOYEE"],
  },
  {
    title: "Izin & Cuti",
    url: "/izin",
    icon: FileText,
    roles: ["EMPLOYEE"],
  },
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    title: "Kehadiran",
    url: "/admin/kehadiran",
    icon: CalendarCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Rekapan Karyawan",
    url: "/admin/rekapan-karyawan",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    title: "Pengajuan Izin",
    url: "/admin/izin",
    icon: ClipboardCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Approval Absensi",
    url: "/admin/verifikasi",
    icon: ShieldCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Laporan",
    url: "/admin/laporan",
    icon: Download,
    roles: ["ADMIN"],
  },
];

export const settingsItems: MenuItem[] = [
  {
    title: "Pengaturan",
    url: "/pengaturan",
    icon: Settings,
    roles: ["EMPLOYEE"],
  },
  {
    title: "Lokasi Kantor",
    url: "/admin/lokasi",
    icon: MapPin,
    roles: ["ADMIN"],
  },
  {
    title: "Waktu Kerja",
    url: "/admin/waktu-kerja",
    icon: Clock,
    roles: ["ADMIN"],
  },
  {
    title: "Hari Libur",
    url: "/admin/hari-libur",
    icon: CalendarOff,
    roles: ["ADMIN"],
  },
];

export function filterMenuByRole(items: MenuItem[], role: string): MenuItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

/** Judul halaman untuk navbar, diturunkan dari menu item yang paling cocok
 * dengan path saat ini (fallback ke segmen URL terakhir). */
export function getPageTitle(pathname: string, role: string): string {
  const items = filterMenuByRole([...overviewItems, ...settingsItems], role);

  let best: MenuItem | undefined;
  for (const item of items) {
    if (pathname === item.url || pathname.startsWith(`${item.url}/`)) {
      if (!best || item.url.length > best.url.length) best = item;
    }
  }
  if (best) return best.title;

  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "Dashboard";
  return last.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
