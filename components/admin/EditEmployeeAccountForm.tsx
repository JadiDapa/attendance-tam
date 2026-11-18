"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ROLE_LABEL } from "@/lib/role";
import { updateEmployee } from "@/app/action/user.action";
import {
  EmployeeFormSchema,
  type EmployeeFormInput,
  type EmployeeFormOutput,
} from "@/servers/validators/user.validator";

export type EmployeeAccountValues = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  position: string;
  divisionId?: string | null;
  positionId?: string | null;
};

export type DivisionOption = {
  id: string;
  name: string;
  positions: { id: string; name: string }[];
};

export default function EditEmployeeAccountForm({
  employee,
  divisions = [],
}: {
  employee: EmployeeAccountValues;
  divisions?: DivisionOption[];
}) {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormOutput>({
    resolver: zodResolver(EmployeeFormSchema),
    defaultValues: {
      name: employee.name,
      email: employee.email,
      password: "",
      role: employee.role,
      phone: employee.phone,
      position: employee.position,
      divisionId: employee.divisionId ?? "",
      positionId: employee.positionId ?? "",
    },
  });

  const watchedDivisionId = watch("divisionId");

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateEmployee(employee.id, values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.push(`/admin/daftar-pekerja/${employee.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
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
        <Label htmlFor="password">Password (opsional)</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        <p className="text-muted-foreground text-xs">
          Kosongkan kalau tidak ingin menggantinya.
        </p>
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password.message}</p>
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
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="divisionId">Divisi</Label>
          <Controller
            name="divisionId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(val) => {
                  field.onChange(val);
                  setValue("positionId", "");
                  setValue("position", "");
                }}
              >
                <SelectTrigger id="divisionId" className="w-full">
                  <SelectValue placeholder="Pilih Divisi" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="positionId">Jabatan</Label>
          <Controller
            name="positionId"
            control={control}
            render={({ field }) => {
              const currentDiv = divisions.find((d) => d.id === watchedDivisionId);
              const availablePositions = currentDiv?.positions ?? [];

              return (
                <Select
                  value={field.value || undefined}
                  onValueChange={(val) => {
                    field.onChange(val);
                    const pos = availablePositions.find((p) => p.id === val);
                    if (pos) setValue("position", pos.name);
                  }}
                  disabled={!watchedDivisionId || availablePositions.length === 0}
                >
                  <SelectTrigger id="positionId" className="w-full">
                    <SelectValue
                      placeholder={
                        !watchedDivisionId
                          ? "Pilih divisi dahulu"
                          : availablePositions.length === 0
                          ? "Belum ada jabatan"
                          : "Pilih Jabatan"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePositions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Nomor HP</Label>
        <Input id="phone" placeholder="0812..." {...register("phone")} />
        {errors.phone && (
          <p className="text-destructive text-sm">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Simpan Perubahan
        </Button>
      </div>
    </form>
  );
}
