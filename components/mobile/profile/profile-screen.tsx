"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  Calendar,
  Briefcase,
  Mail,
  Phone,
  IdCard,
  FolderOpen,
  Lock,
  Bell,
  AlarmClock,
  Smartphone,
  Globe,
  FileText,
  Clipboard,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { Avatar } from "@/components/mobile/avatar";
import { SimpleRow } from "@/components/mobile/simple-row";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { useFaceStatusQuery, useMeQuery } from "@/lib/mobile-queries";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma";

const THEME_MODE_LABEL: Record<string, string> = {
  light: "Terang",
  dark: "Gelap",
  system: "Sistem",
};

const THEME_MODES = ["light", "dark", "system"];

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-1/2 items-start gap-2 py-2 pr-2">
      <Icon icon={icon} size={18} tone="muted" />
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground line-clamp-1 block text-xs">
          {label}
        </span>
        <span className="text-foreground line-clamp-1 block text-sm font-medium">
          {value}
        </span>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onValueChange,
  showBorder,
}: {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  showBorder: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3",
        showBorder && "border-border border-b",
      )}
    >
      <Icon icon={icon} size={20} tone="muted" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{label}</p>
        {subtitle && (
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onValueChange(!value)}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          value ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform",
            value && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}

export function ProfileScreen({ role }: { role: Role }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const me = useMeQuery();
  const faceStatus = useFaceStatusQuery();
  const { theme, setTheme } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const handleSignOut = () => {
    void signOut({ redirectUrl: "/welcome" });
  };

  const shell = (children: React.ReactNode) => (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Profile" showBack />
      {children}
      <MobileTabBar role={role} />
    </div>
  );

  if (me.isPending) {
    return shell(
      <div className="flex flex-1 items-center justify-center">
        <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
      </div>,
    );
  }

  if (me.isError || !me.data) {
    return shell(
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-muted-foreground text-center">
          Gagal memuat profil.
        </p>
        <button
          type="button"
          onClick={() => me.refetch()}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-3"
        >
          Coba Lagi
        </button>
      </div>,
    );
  }

  const user = me.data;

  const personalInfo: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: Calendar,
      label: "Tanggal Bergabung",
      value: formatShortDate(user.createdAt),
    },
    { icon: Briefcase, label: "Jabatan", value: user.position ?? "-" },
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Nomor Telepon", value: user.phone ?? "-" },
  ];

  const faceSubtitle = faceStatus.data
    ? `${faceStatus.data.totalPhotos}/${faceStatus.data.minRequired} foto terdaftar`
    : "...";

  return shell(
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="bg-primary h-28" />

      <div className="-mt-12 flex flex-col gap-1 px-5">
        <div className="flex justify-center">
          <Avatar name={user.name} imageUrl={user.profileImageUrl} size={88} />
        </div>

        <div className="flex flex-col items-center gap-0.5 pt-1">
          <p className="text-foreground text-lg font-bold">{user.name}</p>
          <p className="text-muted-foreground text-sm">
            {user.position ?? (user.role === "ADMIN" ? "Admin" : "Staff")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-bold">
            Informasi Pribadi
          </span>
          <div className="bg-muted flex flex-wrap rounded-2xl p-3">
            {personalInfo.map((item) => (
              <InfoField
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </div>

        <div className="bg-muted rounded-2xl px-3">
          <SimpleRow
            icon={IdCard}
            label="Verifikasi Wajah"
            subtitle={faceSubtitle}
            onPress={() => router.push("/verifikasi-wajah")}
            showBorder
          />
          <SimpleRow
            icon={FolderOpen}
            label="Data Kepegawaian Lengkap"
            subtitle="Identitas, kontak, dokumen, dan lainnya"
            onPress={() => router.push("/profil/data-kepegawaian")}
            showBorder
          />
          <SimpleRow
            icon={Lock}
            label="Ubah Password"
            onPress={() => router.push("/ubah-password")}
            showBorder={false}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-bold">Preferensi</span>

          <div className="bg-muted rounded-2xl px-3">
            <ToggleRow
              icon={Bell}
              label="Notifikasi Push"
              subtitle="Terima notifikasi absensi & pengajuan"
              value={pushEnabled}
              onValueChange={setPushEnabled}
              showBorder
            />
            <ToggleRow
              icon={AlarmClock}
              label="Pengingat Absen"
              subtitle="Ingatkan jika belum absen masuk/pulang"
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              showBorder={false}
            />
          </div>

          <div className="bg-muted flex gap-1 rounded-2xl p-1">
            {THEME_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm",
                  mode === theme
                    ? "bg-primary text-background font-medium"
                    : "text-muted-foreground",
                )}
              >
                {THEME_MODE_LABEL[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-bold">
            Perangkat & Sesi
          </span>
          <div className="bg-muted rounded-2xl px-3">
            <SimpleRow
              icon={Smartphone}
              label="Perangkat Aktif"
              subtitle="1 perangkat"
              showBorder={false}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-bold">Lainnya</span>
          <div className="bg-muted rounded-2xl px-3">
            <SimpleRow
              icon={Globe}
              label="Bahasa"
              subtitle="Indonesia"
              showBorder
            />
            <SimpleRow icon={FileText} label="Kebijakan Privasi" showBorder />
            <SimpleRow icon={Clipboard} label="Syarat & Ketentuan" showBorder />
            <SimpleRow
              icon={Info}
              label="Tentang Aplikasi"
              subtitle="v1.1.0"
              showBorder={false}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="bg-destructive/10 text-destructive rounded-xl py-3 text-center text-sm font-medium"
        >
          Keluar
        </button>
      </div>
    </div>,
  );
}
