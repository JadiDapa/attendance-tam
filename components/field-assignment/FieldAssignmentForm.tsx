"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon as Plus } from "@radix-ui/react-icons";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { createFieldAssignment } from "@/app/action/field-assignment.action";
import { TransportationType } from "@/generated/prisma";
import { TRANSPORTATION_LABEL } from "@/lib/field-assignment";
import {
  CreateFieldAssignmentSchema,
  type CreateFieldAssignmentDTO,
  type CreateFieldAssignmentInput,
} from "@/servers/validators/field-assignment.validator";

type EmployeeOption = { value: string; label: string };

export default function FieldAssignmentForm({
  today,
  employees,
}: {
  today: string;
  employees: { id: string; name: string; position: string | null }[];
}) {
  const router = useRouter();
  const anchor = useComboboxAnchor();
  const [open, setOpen] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const employeeOptions: EmployeeOption[] = employees.map((employee) => ({
    value: employee.id,
    label: employee.position ? `${employee.name} — ${employee.position}` : employee.name,
  }));

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFieldAssignmentInput, unknown, CreateFieldAssignmentDTO>({
    resolver: zodResolver(CreateFieldAssignmentSchema),
    defaultValues: {
      employeeIds: [],
      startDate: today,
      endDate: today,
      activityDetail: "",
      destinationCity: "",
      destinationAddress: "",
      purpose: "",
      companyName: "",
      transportation: undefined,
      transportationOther: "",
      estimatedCost: undefined,
    },
  });

  const transportation = useWatch({ control, name: "transportation" });

  const onSubmit = handleSubmit(async (values) => {
    if (!attachment) {
      setAttachmentError("Lampiran surat tugas wajib diunggah");
      return;
    }

    setAttachmentError(null);

    const formData = new FormData();
    for (const id of values.employeeIds) formData.append("employeeIds", id);
    formData.set("startDate", values.startDate);
    formData.set("endDate", values.endDate);
    formData.set("activityDetail", values.activityDetail);
    formData.set("destinationCity", values.destinationCity);
    formData.set("destinationAddress", values.destinationAddress);
    formData.set("purpose", values.purpose);
    if (values.companyName) formData.set("companyName", values.companyName);
    formData.set("transportation", values.transportation);
    if (values.transportationOther) {
      formData.set("transportationOther", values.transportationOther);
    }
    formData.set("estimatedCost", String(values.estimatedCost));
    formData.set("attachment", attachment);

    const result = await createFieldAssignment(formData);

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

        if (!next) {
          reset();
          setAttachment(null);
          setAttachmentError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Buat Penugasan
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Penugasan Dinas Luar</DialogTitle>
          <DialogDescription>
            Pengajuan akan berstatus menunggu sampai disetujui manager.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Karyawan</Label>
            <Controller
              control={control}
              name="employeeIds"
              render={({ field }) => {
                const selected = employeeOptions.filter((option) =>
                  field.value.includes(option.value),
                );

                return (
                  <Combobox
                    multiple
                    items={employeeOptions}
                    value={selected}
                    onValueChange={(next) =>
                      field.onChange(next.map((option) => option.value))
                    }
                  >
                    <ComboboxChips ref={anchor}>
                      {selected.map((option) => (
                        <ComboboxChip key={option.value}>{option.label}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder="Cari karyawan..." />
                    </ComboboxChips>
                    <ComboboxContent anchor={anchor}>
                      <ComboboxEmpty>Karyawan tidak ditemukan</ComboboxEmpty>
                      <ComboboxList>
                        {(option: EmployeeOption) => (
                          <ComboboxItem key={option.value} value={option}>
                            {option.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                );
              }}
            />
            {errors.employeeIds && (
              <p className="text-destructive text-sm">
                {errors.employeeIds.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Tanggal Berangkat</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-destructive text-sm">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">Estimasi Tanggal Pulang</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-destructive text-sm">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="destinationCity">Tujuan Kota</Label>
            <Input
              id="destinationCity"
              placeholder="Contoh: Surabaya"
              {...register("destinationCity")}
            />
            {errors.destinationCity && (
              <p className="text-destructive text-sm">
                {errors.destinationCity.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="destinationAddress">Lokasi/Alamat Tujuan</Label>
            <Textarea
              id="destinationAddress"
              rows={2}
              placeholder="Contoh: Jl. Pemuda No. 1, Surabaya"
              {...register("destinationAddress")}
            />
            {errors.destinationAddress && (
              <p className="text-destructive text-sm">
                {errors.destinationAddress.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="purpose">Keperluan Dinas</Label>
            <Input
              id="purpose"
              placeholder="Contoh: Kunjungan klien"
              {...register("purpose")}
            />
            {errors.purpose && (
              <p className="text-destructive text-sm">
                {errors.purpose.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName">
              Nama Perusahaan/Instansi yang Dikunjungi (opsional)
            </Label>
            <Input
              id="companyName"
              placeholder="Contoh: PT Maju Jaya"
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-destructive text-sm">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transportation">Transportasi</Label>
            <Controller
              control={control}
              name="transportation"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="transportation" className="w-full">
                    <SelectValue placeholder="Pilih transportasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TransportationType).map((option) => (
                      <SelectItem key={option} value={option}>
                        {TRANSPORTATION_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.transportation && (
              <p className="text-destructive text-sm">
                {errors.transportation.message}
              </p>
            )}
          </div>

          {transportation === TransportationType.LAINNYA && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="transportationOther">Transportasi Lainnya</Label>
              <Input
                id="transportationOther"
                placeholder="Sebutkan transportasi yang digunakan"
                {...register("transportationOther")}
              />
              {errors.transportationOther && (
                <p className="text-destructive text-sm">
                  {errors.transportationOther.message}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="estimatedCost">Estimasi Biaya (Rp)</Label>
            <Input
              id="estimatedCost"
              type="number"
              min={1}
              step={1}
              placeholder="Contoh: 1500000"
              {...register("estimatedCost", { valueAsNumber: true })}
            />
            {errors.estimatedCost && (
              <p className="text-destructive text-sm">
                {errors.estimatedCost.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="activityDetail">Kegiatan/Tujuan</Label>
            <Textarea
              id="activityDetail"
              rows={3}
              placeholder="Contoh: kunjungan klien di Surabaya"
              {...register("activityDetail")}
            />
            {errors.activityDetail && (
              <p className="text-destructive text-sm">
                {errors.activityDetail.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attachment">Upload Rincian Biaya (wajib)</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                setAttachment(event.target.files?.[0] ?? null);
                if (attachmentError) setAttachmentError(null);
              }}
            />
            <p className="text-muted-foreground text-xs">
              JPG, PNG, WEBP, atau PDF, maks 5MB.
            </p>
            {attachmentError && (
              <p className="text-destructive text-sm">{attachmentError}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Kirim Penugasan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
