import { LogOut, Palette } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import ThemeOptions from "@/components/settings/ThemeOptions";
import SignOutButton from "@/components/settings/SignOutButton";

export default function PengaturanPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Pengaturan"
        subtitle="Preferensi tampilan dan sesi login."
      />

      <Panel title="Tampilan" icon={Palette} contentClassName="p-4 sm:p-5">
        <ThemeOptions />
      </Panel>

      <Panel title="Sesi" icon={LogOut} contentClassName="p-4 sm:p-5">
        <SignOutButton />
      </Panel>
    </div>
  );
}
