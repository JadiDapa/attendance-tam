import type { ComponentType } from "react";
import {
  DashboardIcon as LayoutDashboard,
  CalendarIcon as CalendarCheck,
  CalendarIcon as CalendarClock,
  CalendarIcon as CalendarOff,
  FileTextIcon as FileText,
  AvatarIcon as Users,
  BarChartIcon as BarChart,
  SewingPinIcon as MapPin,
  ClipboardIcon as ClipboardCheck,
  ClockIcon as Clock,
  DownloadIcon as Download,
  BadgeIcon as ShieldCheck,
  GearIcon as Settings,
  PersonIcon as UserPlus,
} from "@radix-ui/react-icons";

type Icon = ComponentType<{ className?: string }>;

export type MenuItem = {
  title: string;
  url: string;
  icon: Icon;
  roles?: string[];
  submenu?: { title: string; url: string }[];
  /**
   * Sub-grup di dalam grup "Menu" utama. Cuma dipakai ADMIN/SUPERVISOR/MANAGER
   * supaya menu kerja mereka (menilai/mengelola karyawan lain) tidak
   * bercampur dengan menu pribadi mereka sendiri (absen, lembur). Employee
   * tidak butuh ini — semua menunya memang untuk dirinya sendiri.
   */
  group?: "manajemen" | "general";
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
    group: "manajemen",
  },
  {
    title: "Kehadiran",
    url: "/admin/kehadiran",
    icon: CalendarCheck,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Daftar Pekerja",
    url: "/admin/daftar-pekerja",
    icon: Users,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Permintaan Akun",
    url: "/admin/permintaan-akun",
    icon: UserPlus,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Rekapan Kehadiran",
    url: "/admin/rekapan-kehadiran",
    icon: BarChart,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Pengajuan Izin",
    url: "/admin/izin",
    icon: ClipboardCheck,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Pengajuan Lembur",
    url: "/admin/lembur",
    icon: Clock,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Verifikasi Absensi",
    url: "/admin/verifikasi",
    icon: ShieldCheck,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Pengajuan Dinas Luar",
    url: "/admin/dinas-luar",
    icon: MapPin,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Laporan",
    url: "/admin/laporan",
    icon: Download,
    roles: ["ADMIN"],
    group: "manajemen",
  },
  {
    title: "Absensi Saya",
    url: "/admin/absensi",
    icon: Clock,
    roles: ["ADMIN"],
    group: "general",
  },
  {
    title: "Lembur Saya",
    url: "/admin/lembur-saya",
    icon: CalendarClock,
    roles: ["ADMIN"],
    group: "general",
  },
  {
    title: "Pengajuan Izin",
    url: "/supervisor/izin",
    icon: ClipboardCheck,
    roles: ["SUPERVISOR"],
    group: "manajemen",
  },
  {
    title: "Pengajuan Lembur",
    url: "/supervisor/lembur",
    icon: Clock,
    roles: ["SUPERVISOR"],
    group: "manajemen",
  },
  {
    title: "Dinas Luar",
    url: "/supervisor/dinas-luar",
    icon: MapPin,
    roles: ["SUPERVISOR"],
    group: "manajemen",
  },
  {
    title: "Verifikasi Absensi",
    url: "/supervisor/verifikasi",
    icon: ShieldCheck,
    roles: ["SUPERVISOR"],
    group: "manajemen",
  },
  {
    title: "Absensi Saya",
    url: "/supervisor/absensi",
    icon: Clock,
    roles: ["SUPERVISOR"],
    group: "general",
  },
  {
    title: "Lembur Saya",
    url: "/supervisor/lembur-saya",
    icon: CalendarClock,
    roles: ["SUPERVISOR"],
    group: "general",
  },
  {
    title: "Pengajuan Izin",
    url: "/manager/izin",
    icon: ClipboardCheck,
    roles: ["MANAGER"],
    group: "manajemen",
  },
  {
    title: "Lembur",
    url: "/manager/lembur",
    icon: Clock,
    roles: ["MANAGER"],
    group: "manajemen",
  },
  {
    title: "Dinas Luar",
    url: "/manager/dinas-luar",
    icon: MapPin,
    roles: ["MANAGER"],
    group: "manajemen",
  },
  {
    title: "Verifikasi Absensi",
    url: "/manager/verifikasi",
    icon: ShieldCheck,
    roles: ["MANAGER"],
    group: "manajemen",
  },
  {
    title: "Absensi Saya",
    url: "/manager/absensi",
    icon: Clock,
    roles: ["MANAGER"],
    group: "general",
  },
  {
    title: "Lembur Saya",
    url: "/manager/lembur-saya",
    icon: CalendarClock,
    roles: ["MANAGER"],
    group: "general",
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

/** Pisahkan item "Menu" jadi tiga grup tampilan berdasarkan `group`:
 * item tanpa `group` (mis. semua menu karyawan) tetap satu grup "Menu"
 * seperti sebelumnya, sementara ADMIN/SUPERVISOR/MANAGER kebagian dua grup
 * terpisah — "Manajemen" (menilai/mengelola karyawan lain) dan "General"
 * (absen & lembur untuk diri sendiri) — supaya tidak bercampur. */
export function splitMenuByGroup(items: MenuItem[]): {
  menu: MenuItem[];
  manajemen: MenuItem[];
  general: MenuItem[];
} {
  return {
    menu: items.filter((item) => !item.group),
    manajemen: items.filter((item) => item.group === "manajemen"),
    general: items.filter((item) => item.group === "general"),
  };
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
