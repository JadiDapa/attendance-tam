import AuthCarousel from "@/components/auth/AuthCarousel";
import AuthHeader from "@/components/auth/AuthHeader";
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      <main className="flex flex-col items-center justify-center p-4 lg:px-40">
        <AuthHeader
          title="Welcome Back!"
          subtitle="Before we continue further, We need you to login using your existing account!"
        />
        <LoginForm />
        <p className="mt-4 text-center lg:mt-6">
          Dont have an account?{" "}
          <Link className="text-primary underline" href="/register">
            Create Now!
          </Link>
        </p>
      </main>
      <AuthCarousel />
    </section>
  );
}
