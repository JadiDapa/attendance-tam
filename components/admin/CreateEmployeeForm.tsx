"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArchiveIcon as Archive,
  BackpackIcon as Backpack,
  CardStackIcon as CardStack,
  IdCardIcon as IdCard,
  PersonIcon as Person,
  ReaderIcon as Reader,
} from "@radix-ui/react-icons";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Panel from "@/components/dashboard/Panel";
import {
  EmploymentStatus,
  Gender,
  MaritalStatus,
  Religion,
  Role,
} from "@/generated/prisma";
import { ROLE_LABEL } from "@/lib/role";
import {
  EMPLOYMENT_STATUS_LABEL,
  GENDER_LABEL,
  MARITAL_STATUS_LABEL,
  RELIGION_LABEL,
} from "@/lib/employee-profile";
import { createEmployeeFull } from "@/app/action/user.action";

type FormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  phone: string;
  position: string;

  nik: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: Gender | "";
  religion: Religion | "";
  maritalStatus: MaritalStatus | "";
  nationality: string;

  domicileAddress: string;
  ktpAddress: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;

  employeeNumber: string;
  workLocation: string;
  employmentStatus: EmploymentStatus | "";
  startDate: string;
  contractEndDate: string;

  previousCompany: string;
  previousPosition: string;
  previousDuration: string;

  trainingName: string;
  trainingOrganizer: string;
  trainingPeriod: string;

  baseSalary: string;
  allowance: string;
  bonus: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bpjsKesehatanNumber: string;
  bpjsKetenagakerjaanNumber: string;
};

type ToggleKey = "identity" | "contact" | "employment" | "payroll";

function SectionToggle({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-sm font-normal">
        Isi sekarang
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function CreateEmployeeForm() {
  const router = useRouter();
  const [sections, setSections] = useState<Record<ToggleKey, boolean>>({
    identity: false,
    contact: false,
    employment: false,
    payroll: false,
  });

  const toggle = (key: ToggleKey) => (value: boolean) =>
    setSections((prev) => ({ ...prev, [key]: value }));

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: Role.EMPLOYEE,
      phone: "",
      position: "",
      nik: "",
      placeOfBirth: "",
      dateOfBirth: "",
      gender: "",
      religion: "",
      maritalStatus: "",
      nationality: "Indonesia",
      domicileAddress: "",
      ktpAddress: "",
      emergencyContactName: "",
      emergencyContactRelation: "",
      emergencyContactPhone: "",
      employeeNumber: "",
      workLocation: "",
      employmentStatus: "",
      startDate: "",
      contractEndDate: "",
      previousCompany: "",
      previousPosition: "",
      previousDuration: "",
      trainingName: "",
      trainingOrganizer: "",
      trainingPeriod: "",
      baseSalary: "",
      allowance: "",
      bonus: "",
      bankAccountNumber: "",
      bankAccountName: "",
      bpjsKesehatanNumber: "",
      bpjsKetenagakerjaanNumber: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (values.password !== values.confirmPassword) {
      setError("confirmPassword", { message: "Konfirmasi password tidak sama" });
      return;
    }

    const result = await createEmployeeFull({
      name: values.name,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      role: values.role,
      phone: values.phone,
      position: values.position,
      personalIdentity: sections.identity
        ? {
            nik: values.nik,
            placeOfBirth: values.placeOfBirth,
            dateOfBirth: values.dateOfBirth,
            gender: values.gender as Gender,
            religion: values.religion as Religion,
            maritalStatus: values.maritalStatus as MaritalStatus,
            nationality: values.nationality,
          }
        : undefined,
      contact: sections.contact
        ? {
            domicileAddress: values.domicileAddress,
            ktpAddress: values.ktpAddress,
            emergencyContactName: values.emergencyContactName,
            emergencyContactRelation: values.emergencyContactRelation,
            emergencyContactPhone: values.emergencyContactPhone,
          }
        : undefined,
      employmentData: sections.employment
        ? {
            employeeNumber: values.employeeNumber,
            workLocation: values.workLocation,
            employmentStatus: values.employmentStatus as EmploymentStatus,
            startDate: values.startDate,
            contractEndDate: values.contractEndDate,
          }
        : undefined,
      workHistory: {
        previousCompany: values.previousCompany,
        previousPosition: values.previousPosition,
        previousDuration: values.previousDuration,
      },
      training: {
        name: values.trainingName,
        organizer: values.trainingOrganizer,
        period: values.trainingPeriod,
      },
      payroll: sections.payroll
        ? {
            baseSalary: values.baseSalary,
            allowance: values.allowance || undefined,
            bonus: values.bonus || undefined,
            bankAccountNumber: values.bankAccountNumber,
            bankAccountName: values.bankAccountName,
            bpjsKesehatanNumber: values.bpjsKesehatanNumber,
            bpjsKetenagakerjaanNumber: values.bpjsKetenagakerjaanNumber,
          }
        : undefined,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.push("/admin/daftar-pekerja");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Panel title="Data Akun" icon={Person} contentClassName="p-4 sm:p-5">
        <div className="flex max-w-lg flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" required {...register("name")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required {...register("email")} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                {...register("password")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
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
          </div>
        </div>
      </Panel>

      <Panel
        title="Identitas Pribadi"
        icon={IdCard}
        contentClassName="p-4 sm:p-5"
        action={
          <SectionToggle
            id="toggle-identity"
            checked={sections.identity}
            onCheckedChange={toggle("identity")}
          />
        }
      >
        {sections.identity ? (
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
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="placeOfBirth">Tempat Lahir</Label>
              <Input id="placeOfBirth" {...register("placeOfBirth")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dateOfBirth">Tanggal Lahir</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
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
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="nationality">Kewarganegaraan</Label>
              <Input id="nationality" {...register("nationality")} />
            </div>

            <p className="text-muted-foreground text-xs sm:col-span-2">
              Foto KTP bisa diunggah nanti lewat halaman profil pekerja ini.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Dilewati — bisa dilengkapi nanti lewat halaman profil pekerja ini.
          </p>
        )}
      </Panel>

      <Panel
        title="Kontak Domisili & Darurat"
        icon={Backpack}
        contentClassName="p-4 sm:p-5"
        action={
          <SectionToggle
            id="toggle-contact"
            checked={sections.contact}
            onCheckedChange={toggle("contact")}
          />
        }
      >
        {sections.contact ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="domicileAddress">Alamat Domisili</Label>
              <Textarea
                id="domicileAddress"
                rows={2}
                {...register("domicileAddress")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ktpAddress">Alamat KTP</Label>
              <Textarea id="ktpAddress" rows={2} {...register("ktpAddress")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyContactName">Nama Kontak Darurat</Label>
                <Input
                  id="emergencyContactName"
                  {...register("emergencyContactName")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyContactRelation">
                  Hubungan Keluarga
                </Label>
                <Input
                  id="emergencyContactRelation"
                  placeholder="Contoh: Suami, Orang tua"
                  {...register("emergencyContactRelation")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyContactPhone">Nomor Telepon</Label>
                <Input
                  id="emergencyContactPhone"
                  inputMode="tel"
                  {...register("emergencyContactPhone")}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Dilewati — bisa dilengkapi nanti lewat halaman profil pekerja ini.
          </p>
        )}
      </Panel>

      <Panel
        title="Data Kepegawaian"
        icon={CardStack}
        contentClassName="p-4 sm:p-5"
        action={
          <SectionToggle
            id="toggle-employment"
            checked={sections.employment}
            onCheckedChange={toggle("employment")}
          />
        }
      >
        {sections.employment ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="employeeNumber">Nomor Induk Pegawai (NIP)</Label>
              <Input id="employeeNumber" {...register("employeeNumber")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="workLocation">Lokasi Kerja</Label>
              <Input id="workLocation" {...register("workLocation")} />
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
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Tanggal Masuk</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contractEndDate">
                Tanggal Berakhir Kontrak (khusus PKWT)
              </Label>
              <Input
                id="contractEndDate"
                type="date"
                {...register("contractEndDate")}
              />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Dilewati — bisa dilengkapi nanti lewat halaman profil pekerja ini.
          </p>
        )}
      </Panel>

      <Panel
        title="Riwayat Pekerjaan"
        icon={Archive}
        contentClassName="p-4 sm:p-5"
      >
        <p className="text-muted-foreground -mt-1 mb-3 text-xs">
          Opsional — kosongkan kalau belum pernah bekerja di tempat lain
          sebelumnya.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="previousCompany">Perusahaan Sebelumnya</Label>
            <Input id="previousCompany" {...register("previousCompany")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="previousPosition">Posisi Sebelumnya</Label>
            <Input id="previousPosition" {...register("previousPosition")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="previousDuration">Lama Bekerja</Label>
            <Input
              id="previousDuration"
              placeholder="Contoh: 2 tahun 3 bulan"
              {...register("previousDuration")}
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Penggajian"
        icon={CardStack}
        contentClassName="p-4 sm:p-5"
        action={
          <SectionToggle
            id="toggle-payroll"
            checked={sections.payroll}
            onCheckedChange={toggle("payroll")}
          />
        }
      >
        {sections.payroll ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseSalary">Gaji Pokok</Label>
              <Input
                id="baseSalary"
                type="number"
                inputMode="numeric"
                {...register("baseSalary")}
              />
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
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bankAccountName">Nama Pemilik Rekening</Label>
              <Input id="bankAccountName" {...register("bankAccountName")} />
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
        ) : (
          <p className="text-muted-foreground text-sm">
            Dilewati — bisa dilengkapi nanti lewat halaman profil pekerja ini.
          </p>
        )}
      </Panel>

      <Panel title="Pelatihan" icon={Reader} contentClassName="p-4 sm:p-5">
        <p className="text-muted-foreground mb-3 text-xs">
          Opsional — satu pelatihan bisa diisi di sini, tambahan lainnya bisa
          dilengkapi nanti lewat halaman profil pekerja ini.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="trainingName">Nama Pelatihan</Label>
            <Input
              id="trainingName"
              placeholder="Contoh: Pelatihan K3"
              {...register("trainingName")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="trainingOrganizer">Penyelenggara</Label>
            <Input
              id="trainingOrganizer"
              placeholder="Contoh: Kemnaker RI"
              {...register("trainingOrganizer")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="trainingPeriod">Tahun/Periode</Label>
            <Input
              id="trainingPeriod"
              placeholder="Contoh: 2024"
              {...register("trainingPeriod")}
            />
          </div>
        </div>
      </Panel>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Buat Akun
        </Button>
      </div>
    </form>
  );
}
