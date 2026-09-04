import AuthCarousel from "@/components/auth/AuthCarousel";
import AuthHeader from "@/components/auth/AuthHeader";
import LoginForm from "@/components/auth/LoginForm";

/**
 * Hanya terima path relatif dalam app sendiri sebagai callbackUrl — kalau
 * diterima apa adanya, seseorang bisa mengarang `?callbackUrl=https://evil...`
 * dan membuat login mengarahkan user ke luar (open redirect).
 */
function safeCallbackUrl(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;

  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <section className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      <main className="flex flex-col items-center justify-center p-4 lg:px-40">
        <AuthHeader
          title="Welcome Back!"
          subtitle="Before we continue further, We need you to login using your existing account!"
        />
        <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />
        <p className="text-muted-foreground mt-4 text-center lg:mt-6">
          Don&apos;t have an account? Contact your administrator to get one
          created.
        </p>
      </main>
      <AuthCarousel />
    </section>
  );
}
