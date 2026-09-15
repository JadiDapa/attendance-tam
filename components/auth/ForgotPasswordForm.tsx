"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EnvelopeClosedIcon as Mail } from "@radix-ui/react-icons";
import { useSignIn } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  ForgotPasswordDTO,
  ForgotPasswordSchema,
} from "@/servers/validators/auth.validator";
import { Spinner } from "../ui/spinner";

const GENERIC_ERROR = "Gagal mengirim kode. Periksa kembali email kamu.";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();

  const form = useForm<ForgotPasswordDTO>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordDTO) => {
    if (!isLoaded) return;

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: values.email,
      });

      toast.success("Kode reset password sudah dikirim ke email kamu");

      router.push(
        `/reset-password?email=${encodeURIComponent(values.email)}`,
      );
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? (error.errors[0]?.longMessage ?? GENERIC_ERROR)
        : GENERIC_ERROR;

      form.setError("email", { message });
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
          "Kirim kode"
        )}
      </Button>
    </form>
  );
}
