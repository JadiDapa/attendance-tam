"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { toast } from "sonner";
import { MobilePageHeader } from "@/components/mobile/page-header";

const GENERIC_ERROR = "Gagal mengganti password, silakan coba lagi";
const MIN_PASSWORD_LENGTH = 8;

/** Mirrors mobile's `ChangePasswordScreen` — same Clerk `updatePassword()` call as desktop's `ChangePasswordForm`. */
export function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!currentPassword) return "Password saat ini wajib diisi";
    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter`;
    if (newPassword !== confirmPassword)
      return "Konfirmasi password tidak cocok";
    if (newPassword === currentPassword)
      return "Password baru harus berbeda dari password saat ini";
    return null;
  }

  async function onSubmit() {
    if (!user || submitting) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
      toast.success("Password berhasil diganti");
      router.back();
    } catch (err) {
      setError(
        isClerkAPIResponseError(err)
          ? (err.errors[0]?.longMessage ?? GENERIC_ERROR)
          : GENERIC_ERROR,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const disabled =
    submitting || !currentPassword || !newPassword || !confirmPassword;

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Ubah Password" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Password saat ini
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Masukkan password saat ini"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Password baru
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Masukkan password baru"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
          <span className="text-muted-foreground text-xs">
            Minimal {MIN_PASSWORD_LENGTH} karakter.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Ulangi password baru
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
        </div>

        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="bg-primary text-primary-foreground mt-2 w-full rounded-full py-4 text-center text-base font-semibold disabled:opacity-60"
        >
          Simpan Password
        </button>
      </div>
    </div>
  );
}
