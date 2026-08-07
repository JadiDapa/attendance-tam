import { Suspense } from "react";
import type { Metadata } from "next";
import { Fingerprint } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk | Sistem Absensi",
};

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-11 items-center justify-center rounded-xl">
          <Fingerprint className="size-6" />
        </div>
        <CardTitle className="mt-3 text-xl">Sistem Absensi Karyawan</CardTitle>
        <CardDescription>
          Masuk dengan akun yang diberikan oleh admin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
