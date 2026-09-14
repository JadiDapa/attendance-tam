"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { EmploymentStatus } from "@/generated/prisma";
import { upsertEmploymentData } from "@/app/action/employee-profile.action";
import {
  EmploymentDataSchema,
  type EmploymentDataInput,
} from "@/servers/validators/employee-profile.validator";
import { EMPLOYMENT_STATUS_LABEL } from "@/lib/employee-profile";

type Props = {
  initial: {
    employeeNumber: string;
    workLocation: string;
    employmentStatus: EmploymentStatus | "";
    startDate: string;
    contractEndDate: string;
  };
  targetUserId?: string;
};

export default function EmploymentDataForm({ initial, targetUserId }: Props) {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmploymentDataInput>({
    resolver: zodResolver(EmploymentDataSchema),
    defaultValues: {
      employeeNumber: initial.employeeNumber,
      workLocation: initial.workLocation,
      employmentStatus: initial.employmentStatus || undefined,
      startDate: initial.startDate,
      contractEndDate: initial.contractEndDate,
    },
  });

  const employmentStatus = useWatch({ control, name: "employmentStatus" });

  const onSubmit = handleSubmit(async (values) => {
    const result = await upsertEmploymentData(values, targetUserId);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="employeeNumber">Nomor Induk Pegawai (NIP)</Label>
          <Input id="employeeNumber" {...register("employeeNumber")} />
          {errors.employeeNumber && (
            <p className="text-destructive text-sm">
              {errors.employeeNumber.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="workLocation">Lokasi Kerja</Label>
          <Input id="workLocation" {...register("workLocation")} />
          {errors.workLocation && (
            <p className="text-destructive text-sm">
              {errors.workLocation.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="employmentStatus">Status Karyawan</Label>
          <Controller
            control={control}
            name="employmentStatus"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="employmentStatus" className="w-full">
                  <SelectValue placeholder="Pilih status karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EmploymentStatus).map((value) => (
                    <SelectItem key={value} value={value}>
                      {EMPLOYMENT_STATUS_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.employmentStatus && (
            <p className="text-destructive text-sm">
              {errors.employmentStatus.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Tanggal Masuk</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && (
            <p className="text-destructive text-sm">
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contractEndDate">
            Tanggal Berakhir Kontrak{" "}
            {employmentStatus === EmploymentStatus.PKWT
              ? "(wajib untuk PKWT)"
              : "(khusus PKWT)"}
          </Label>
          <Input
            id="contractEndDate"
            type="date"
            {...register("contractEndDate")}
          />
          {errors.contractEndDate && (
            <p className="text-destructive text-sm">
              {errors.contractEndDate.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Simpan
        </Button>
      </div>
    </form>
  );
}
