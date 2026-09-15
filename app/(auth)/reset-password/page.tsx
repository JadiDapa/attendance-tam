import Link from "next/link";

import AuthCarousel from "@/components/auth/AuthCarousel";
import AuthHeader from "@/components/auth/AuthHeader";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { email: rawEmail } = await searchParams;
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;

  return (
    <section className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      <main className="flex flex-col items-center justify-center p-4 lg:px-40">
        <AuthHeader
          title="Buat password baru"
          subtitle="Masukkan kode 6 digit yang dikirim ke emailmu dan password barumu."
        />
        <ResetPasswordForm email={email} />
        <p className="text-muted-foreground mt-4 text-center lg:mt-6">
          <Link href="/forgot-password" className="text-primary font-medium">
            Kirim ulang kode
          </Link>
        </p>
      </main>
      <AuthCarousel />
    </section>
  );
}
