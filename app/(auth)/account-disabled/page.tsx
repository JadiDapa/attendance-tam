"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";

/**
 * Ditampilkan saat sesi Clerk valid tapi user-nya tidak ditemukan/dinonaktifkan
 * di database (dihapus, atau dinonaktifkan admin). Sesi Clerk langsung dicabut
 * di sini supaya tidak nyangkut login dengan akun yang sudah tidak valid.
 */
export default function AccountDisabledPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    void signOut(() => router.replace("/login"));
  }, [signOut, router]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Spinner className="h-6 w-6" />
      <div>
        <p className="text-lg font-semibold">Akun tidak aktif</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Akun Anda sudah dinonaktifkan atau tidak ditemukan. Menghubungi admin
          untuk info lebih lanjut. Mengalihkan ke halaman login...
        </p>
      </div>
    </div>
  );
}
