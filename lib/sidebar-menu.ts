import {
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  FileText,
  Users,
  MapPin,
  ClipboardCheck,
  Clock,
  Download,
  ShieldCheck,
  Settings,
  LucideIcon,
} from "lucide-react";

export type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
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
