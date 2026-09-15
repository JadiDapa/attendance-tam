"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  EyeOpenIcon as Eye,
  EyeClosedIcon as EyeClosed,
  LockClosedIcon as Lock,
} from "@radix-ui/react-icons";
import { useSignIn } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  ResetPasswordDTO,
  ResetPasswordSchema,
} from "@/servers/validators/auth.validator";
import { Spinner } from "../ui/spinner";

type Props = {
  email?: string;
};

const GENERIC_ERROR = "Kode tidak valid atau sudah kedaluwarsa";

export default function ResetPasswordForm({ email }: Props) {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [isVisible, setIsVisible] = useState(false);

  const form = useForm<ResetPasswordDTO>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { code: "", password: "" },
  });

  const onSubmit = async (values: ResetPasswordDTO) => {
    if (!isLoaded) return;

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: values.code,
      });

      if (attempt.status !== "needs_new_password") {
        form.setError("code", { message: GENERIC_ERROR });
        toast.error(GENERIC_ERROR);
        return;
      }

      const result = await signIn.resetPassword({
        password: values.password,
      });

      if (result.status !== "complete") {
        form.setError("code", { message: GENERIC_ERROR });
        toast.error(GENERIC_ERROR);
        return;
      }

      await setActive({ session: result.createdSessionId });

      toast.success("Password berhasil diubah");

      router.replace("/");
      router.refresh();
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? (error.errors[0]?.longMessage ?? GENERIC_ERROR)
        : GENERIC_ERROR;

      form.setError("code", { message });
      toast.error(message);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-4 w-full lg:mt-6"
    >
      <FieldGroup className="gap-4">
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="items-center">
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="mt-1" />
              )}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="relative">
                <Lock className="text-primary-subtle pointer-events-none absolute top-1/2 left-5 z-10 size-6 -translate-y-1/2" />

                <Input
                  {...field}
                  id={field.name}
                  type={isVisible ? "text" : "password"}
                  placeholder="Password baru"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  className="border-primary h-10 w-full rounded-full border-2 ps-14 pe-14 lg:h-12"
                />

                <button
                  type="button"
                  onClick={() => setIsVisible((prev) => !prev)}
                  className="text-primary-subtle absolute top-1/2 right-5 z-10 -translate-y-1/2"
                  aria-label={isVisible ? "Hide password" : "Show password"}
                >
                  {isVisible ? (
                    <Eye className="size-6" />
                  ) : (
                    <EyeClosed className="size-6" />
                  )}
                </button>
              </div>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="mt-1" />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="mt-6 flex h-10 w-full items-center gap-3 text-lg lg:mt-10 lg:h-12"
      >
        {form.formState.isSubmitting ? (
          <>
            Menyimpan
            <Spinner className="h-5 w-5" />
          </>
        ) : (
          "Simpan password"
        )}
      </Button>

      {email && (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Kode dikirim ke {email}
        </p>
      )}
    </form>
  );
}
