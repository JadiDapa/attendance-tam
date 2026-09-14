"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  ChangePasswordSchema,
  type ChangePasswordInput,
} from "@/servers/validators/profile.validator";

const GENERIC_ERROR = "Gagal mengganti password, silakan coba lagi";

export default function ChangePasswordForm() {
  const { user } = useUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;

    try {
      // Password saat ini diverifikasi Clerk sendiri — kalau salah, akan
      // muncul sebagai ClerkAPIResponseError di bawah.
      await user.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        signOutOfOtherSessions: true,
      });

      toast.success("Password berhasil diganti");
      reset();
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? (error.errors[0]?.longMessage ?? GENERIC_ERROR)
        : GENERIC_ERROR;

      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Password saat ini</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-destructive text-sm">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">Password baru</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-destructive text-sm">
            {errors.newPassword.message}
          </p>
        )}
        <p className="text-muted-foreground text-xs">Minimal 8 karakter.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Ulangi password baru</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-sm">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Ganti Password
        </Button>
      </div>
    </form>
  );
}
