import {
  ExitIcon as LogOut,
  ColorWheelIcon as Palette,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import ThemeOptions from "@/components/settings/ThemeOptions";
import SignOutButton from "@/components/settings/SignOutButton";
import { ProfileScreen } from "@/components/mobile/profile/profile-screen";
import { requireUser } from "@/lib/session";

export default async function PengaturanPage() {
  const user = await requireUser();

  return (
    <>
      <ProfileScreen role={user.role} />

      <div className="hidden max-w-3xl flex-col gap-5 md:flex">
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
    </>
  );
}
