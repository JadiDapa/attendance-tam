"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  EyeOpenIcon as Eye,
  EyeClosedIcon as EyeClosed,
  LockClosedIcon as Lock,
  PersonIcon as User,
} from "@radix-ui/react-icons";
import { useSignIn } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { LoginDTO, LoginSchema } from "@/servers/validators/auth.validator";
import { Spinner } from "../ui/spinner";

type Props = {
  callbackUrl?: string;
};

const GENERIC_ERROR = "Email atau password salah";

export default function LoginForm({ callbackUrl }: Props) {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [isVisible, setIsVisible] = useState(false);

  const form = useForm<LoginDTO>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginDTO) => {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: values.email,
        password: values.password,
      });

      if (result.status !== "complete") {
        // MVP: hanya strategi email+password, tidak ada faktor tambahan.
        form.setError("password", { message: GENERIC_ERROR });
        toast.error(GENERIC_ERROR);
        return;
      }

      await setActive({ session: result.createdSessionId });

      toast.success("Berhasil masuk");

      router.replace(callbackUrl ?? "/");
      router.refresh();
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? (error.errors[0]?.longMessage ?? GENERIC_ERROR)
        : GENERIC_ERROR;

      form.setError("password", { message });
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
                <User className="text-primary-subtle pointer-events-none absolute top-1/2 left-5 z-10 size-6 -translate-y-1/2" />

                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="Username or Email"
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
                  type={isVisible ? "text" : "password"}
                  placeholder="Password"
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

      <div className="mt-3 flex justify-end">
        <Link
          href="/forgot-password"
          className="text-primary-subtle text-sm font-medium"
        >
          Lupa password?
        </Link>
      </div>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="mt-6 flex h-10 w-full items-center gap-3 text-lg lg:mt-10 lg:h-12"
      >
        {form.formState.isSubmitting ? (
          <>
            Submitting
            <Spinner className="h-5 w-5" />
          </>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}
