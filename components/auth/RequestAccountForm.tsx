"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircledIcon as CheckCircle,
  EnvelopeClosedIcon as Mail,
  EyeClosedIcon as EyeClosed,
  EyeOpenIcon as Eye,
  LockClosedIcon as Lock,
  MobileIcon as Phone,
  PersonIcon as User,
} from "@radix-ui/react-icons";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  CreateAccountRequestSchema,
  type CreateAccountRequestDTO,
} from "@/servers/validators/account-request.validator";
import { requestAccount } from "@/app/action/account-request.action";

export default function RequestAccountForm() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<CreateAccountRequestDTO>({
    resolver: zodResolver(CreateAccountRequestSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: CreateAccountRequestDTO) => {
    const result = await requestAccount(values);

    if (!result.ok) {
      form.setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-4 flex w-full flex-col items-center gap-4 text-center lg:mt-6">
        <div className="bg-accent flex size-16 items-center justify-center rounded-full">
          <CheckCircle className="text-primary size-7" />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xl font-bold">Pengajuan terkirim</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Permintaan pembuatan akun kamu sudah dikirim dan menunggu
            persetujuan admin. Kamu akan bisa masuk setelah disetujui.
          </p>
        </div>

        <Button asChild className="mt-2 h-10 w-full lg:h-12">
          <Link href="/login">Kembali ke halaman masuk</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-4 w-full lg:mt-6"
    >
      <FieldGroup className="gap-4">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="relative">
                <User className="text-primary-subtle pointer-events-none absolute top-1/2 left-5 z-10 size-6 -translate-y-1/2" />

                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="Nama lengkap"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                  className="border-primary h-10 w-full rounded-full border-2 ps-14 pe-5 lg:h-12"
                />
              </div>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="mt-1" />
              )}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="relative">
                <Mail className="text-primary-subtle pointer-events-none absolute top-1/2 left-5 z-10 size-6 -translate-y-1/2" />

                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  className="border-primary h-10 w-full rounded-full border-2 ps-14 pe-5 lg:h-12"
                />
              </div>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="mt-1" />
              )}
            </Field>
          )}
        />

        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="relative">
                <Phone className="text-primary-subtle pointer-events-none absolute top-1/2 left-5 z-10 size-6 -translate-y-1/2" />

                <Input
                  {...field}
                  id={field.name}
                  type="tel"
                  placeholder="Nomor HP (opsional)"
                  autoComplete="tel"
                  aria-invalid={fieldState.invalid}
                  className="border-primary h-10 w-full rounded-full border-2 ps-14 pe-5 lg:h-12"
                />
              </div>

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
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  className="border-primary h-10 w-full rounded-full border-2 ps-14 pe-14 lg:h-12"
                />

                <button
                  type="button"
                  onClick={() => setPasswordVisible((prev) => !prev)}
                  className="text-primary-subtle absolute top-1/2 right-5 z-10 -translate-y-1/2"
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible ? (
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

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="relative">
                <Lock className="text-primary-subtle pointer-events-none absolute top-1/2 left-5 z-10 size-6 -translate-y-1/2" />

                <Input
                  {...field}
                  id={field.name}
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Konfirmasi password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  className="border-primary h-10 w-full rounded-full border-2 ps-14 pe-5 lg:h-12"
                />
              </div>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} className="mt-1" />
              )}
            </Field>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            {form.formState.errors.root.message}
          </p>
        )}
      </FieldGroup>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="mt-6 flex h-10 w-full items-center gap-3 text-lg lg:mt-10 lg:h-12"
      >
        {form.formState.isSubmitting ? (
          <>
            Mengirim
            <Spinner className="h-5 w-5" />
          </>
        ) : (
          "Kirim pengajuan"
        )}
      </Button>
    </form>
  );
}
