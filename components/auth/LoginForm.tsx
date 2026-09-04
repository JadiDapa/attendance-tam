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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { LoginDTO, LoginSchema } from "@/servers/validators/auth.validator";
import { login } from "@/app/action/auth.action";
import { Spinner } from "../ui/spinner";

type Props = {
  callbackUrl?: string;
};

export default function LoginForm({ callbackUrl }: Props) {
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);

  const form = useForm<LoginDTO>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginDTO) => {
    const result = await login(values);

    if (!result.ok) {
      form.setError("password", {
        message: result.error,
      });

      toast.error(result.error);
      return;
    }

    toast.success("Berhasil masuk");

    router.replace(callbackUrl ?? result.redirectTo);
    router.refresh();
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
