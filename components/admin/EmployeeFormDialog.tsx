"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Role } from "@/generated/prisma";
import { createEmployee, updateEmployee } from "@/app/action/user.action";
import {
  EmployeeFormSchema,
  type EmployeeFormInput,
  type EmployeeFormOutput,
} from "@/servers/validators/user.validator";

export type EmployeeFormValues = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  position: string;
};

type Props = {
  trigger: ReactNode;
  employee?: EmployeeFormValues;
};

const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Karyawan",
  ADMIN: "Admin",
};

export default function EmployeeFormDialog({ trigger, employee }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(employee);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormOutput>({
    resolver: zodResolver(EmployeeFormSchema),
    defaultValues: {
      name: employee?.name ?? "",
      email: employee?.email ?? "",
      password: "",
      role: employee?.role ?? Role.EMPLOYEE,
      phone: employee?.phone ?? "",
      position: employee?.position ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!employee && !values.password) {
      setError("password", { message: "Password wajib diisi" });
      return;
    }

    const result = employee
      ? await updateEmployee(employee.id, values)
      : await createEmployee({ ...values, password: values.password ?? "" });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Karyawan" : "Tambah Karyawan"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Kosongkan password kalau tidak ingin menggantinya."
              : "Akun baru langsung bisa dipakai login oleh karyawan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">
              Password {isEdit && "(opsional)"}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Role).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="position">Jabatan</Label>
              <Input id="position" placeholder="Staff" {...register("position")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Nomor HP</Label>
            <Input id="phone" placeholder="0812..." {...register("phone")} />
            {errors.phone && (
              <p className="text-destructive text-sm">{errors.phone.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isEdit ? "Simpan Perubahan" : "Buat Akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
