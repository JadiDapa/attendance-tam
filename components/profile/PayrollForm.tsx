"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { upsertPayroll } from "@/app/action/employee-profile.action";
import {
  PayrollSchema,
  type PayrollInput,
} from "@/servers/validators/employee-profile.validator";

type Props = {
  initial: {
    baseSalary: number | "";
    allowance: number | "";
    bonus: number | "";
    bankAccountNumber: string;
    bankAccountName: string;
    bpjsKesehatanNumber: string;
    bpjsKetenagakerjaanNumber: string;
  };
  /** Wajib — admin selalu mengedit penggajian karyawan lain, tidak pernah miliknya sendiri. */
  targetUserId: string;
};

/** ADMIN ONLY — dipakai di halaman detail karyawan admin, tidak pernah di /profil. */
export default function PayrollForm({ initial, targetUserId }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PayrollInput>({
    resolver: zodResolver(PayrollSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await upsertPayroll(values, targetUserId);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="baseSalary">Gaji Pokok</Label>
          <Input
            id="baseSalary"
            type="number"
            inputMode="numeric"
            {...register("baseSalary")}
          />
          {errors.baseSalary && (
            <p className="text-destructive text-sm">
              {errors.baseSalary.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="allowance">Tunjangan</Label>
          <Input
            id="allowance"
            type="number"
            inputMode="numeric"
            {...register("allowance")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bonus">Bonus</Label>
          <Input
            id="bonus"
            type="number"
            inputMode="numeric"
            {...register("bonus")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccountNumber">Nomor Rekening Payroll</Label>
          <Input id="bankAccountNumber" {...register("bankAccountNumber")} />
          {errors.bankAccountNumber && (
            <p className="text-destructive text-sm">
              {errors.bankAccountNumber.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccountName">Nama Pemilik Rekening</Label>
          <Input id="bankAccountName" {...register("bankAccountName")} />
          {errors.bankAccountName && (
            <p className="text-destructive text-sm">
              {errors.bankAccountName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bpjsKesehatanNumber">Nomor BPJS Kesehatan</Label>
          <Input
            id="bpjsKesehatanNumber"
            {...register("bpjsKesehatanNumber")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bpjsKetenagakerjaanNumber">
            Nomor BPJS Ketenagakerjaan
          </Label>
          <Input
            id="bpjsKetenagakerjaanNumber"
            {...register("bpjsKetenagakerjaanNumber")}
          />
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
