import Link from "next/link";

import AuthCarousel from "@/components/auth/AuthCarousel";
import AuthHeader from "@/components/auth/AuthHeader";
import RequestAccountForm from "@/components/auth/RequestAccountForm";

export default function RequestAccountPage() {
  return (
    <section className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      <main className="flex flex-col items-center justify-center overflow-y-auto p-4 lg:px-40">
        <AuthHeader
          title="Ajukan pembuatan akun"
          subtitle="Isi data di bawah ini, admin akan meninjau dan menyetujui pengajuanmu."
        />
        <RequestAccountForm />
        <p className="text-muted-foreground mt-4 text-center lg:mt-6">
          <Link href="/login" className="text-primary font-medium">
            Kembali ke masuk
          </Link>
        </p>
      </main>
      <AuthCarousel />
    </section>
  );
}
