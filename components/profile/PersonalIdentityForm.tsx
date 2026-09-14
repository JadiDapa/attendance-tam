"use client";

import { useState } from "react";
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
import { Gender, MaritalStatus, Religion } from "@/generated/prisma";
import { upsertPersonalIdentity } from "@/app/action/employee-profile.action";
import {
  PersonalIdentitySchema,
  type PersonalIdentityInput,
} from "@/servers/validators/employee-profile.validator";
import {
  GENDER_LABEL,
  MARITAL_STATUS_LABEL,
  RELIGION_LABEL,
} from "@/lib/employee-profile";

type Props = {
  initial: {
    nik: string;
    placeOfBirth: string;
    dateOfBirth: string;
    gender: Gender | "";
    religion: Religion | "";
    maritalStatus: MaritalStatus | "";
    nationality: string;
    ktpPhotoUrl: string | null;
  };
  /** Diisi hanya saat form ini dipakai admin mengedit karyawan lain. */
  targetUserId?: string;
};

export default function PersonalIdentityForm({ initial, targetUserId }: Props) {
  const router = useRouter();
  const [ktpPhoto, setKtpPhoto] = useState<File | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalIdentityInput>({
    resolver: zodResolver(PersonalIdentitySchema),
    defaultValues: {
      nik: initial.nik,
      placeOfBirth: initial.placeOfBirth,
      dateOfBirth: initial.dateOfBirth,
      gender: initial.gender || undefined,
      religion: initial.religion || undefined,
      maritalStatus: initial.maritalStatus || undefined,
      nationality: initial.nationality,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const formData = new FormData();
    formData.set("nik", values.nik);
    formData.set("placeOfBirth", values.placeOfBirth);
    formData.set("dateOfBirth", values.dateOfBirth);
    formData.set("gender", values.gender ?? "");
    formData.set("religion", values.religion ?? "");
    formData.set("maritalStatus", values.maritalStatus ?? "");
    if (values.nationality) formData.set("nationality", values.nationality);
    if (targetUserId) formData.set("targetUserId", targetUserId);
    if (ktpPhoto) formData.set("ktpPhoto", ktpPhoto);

    const result = await upsertPersonalIdentity(formData);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setKtpPhoto(null);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nik">NIK</Label>
          <Input
            id="nik"
            inputMode="numeric"
            maxLength={16}
            placeholder="16 digit NIK KTP"
            {...register("nik")}
          />
          {errors.nik && (
            <p className="text-destructive text-sm">{errors.nik.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="placeOfBirth">Tempat Lahir</Label>
          <Input id="placeOfBirth" {...register("placeOfBirth")} />
          {errors.placeOfBirth && (
            <p className="text-destructive text-sm">
              {errors.placeOfBirth.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          {errors.dateOfBirth && (
            <p className="text-destructive text-sm">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">Jenis Kelamin</Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Gender).map((value) => (
                    <SelectItem key={value} value={value}>
                      {GENDER_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.gender && (
            <p className="text-destructive text-sm">{errors.gender.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="religion">Agama</Label>
          <Controller
            control={control}
            name="religion"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="religion" className="w-full">
                  <SelectValue placeholder="Pilih agama" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Religion).map((value) => (
                    <SelectItem key={value} value={value}>
                      {RELIGION_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.religion && (
            <p className="text-destructive text-sm">
              {errors.religion.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="maritalStatus">Status Perkawinan</Label>
          <Controller
            control={control}
            name="maritalStatus"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="maritalStatus" className="w-full">
                  <SelectValue placeholder="Pilih status perkawinan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MaritalStatus).map((value) => (
                    <SelectItem key={value} value={value}>
                      {MARITAL_STATUS_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.maritalStatus && (
            <p className="text-destructive text-sm">
              {errors.maritalStatus.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nationality">Kewarganegaraan</Label>
          <Input id="nationality" {...register("nationality")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ktpPhoto">Foto KTP</Label>
        <Input
          id="ktpPhoto"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => setKtpPhoto(event.target.files?.[0] ?? null)}
        />
        {initial.ktpPhotoUrl && (
          <a
            href={initial.ktpPhotoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary w-fit text-xs underline"
          >
            Lihat foto KTP saat ini
          </a>
        )}
        <p className="text-muted-foreground text-xs">
          JPG, PNG, WEBP, atau PDF, maks 5MB. Opsional — kosongkan kalau tidak
          ingin mengganti.
        </p>
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
