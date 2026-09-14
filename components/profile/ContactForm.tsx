"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { upsertContact } from "@/app/action/employee-profile.action";
import {
  ContactSchema,
  type ContactInput,
} from "@/servers/validators/employee-profile.validator";

type Props = {
  initial: {
    domicileAddress: string;
    ktpAddress: string;
    emergencyContactName: string;
    emergencyContactRelation: string;
    emergencyContactPhone: string;
  };
  targetUserId?: string;
};

export default function ContactForm({ initial, targetUserId }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await upsertContact(values, targetUserId);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="domicileAddress">Alamat Domisili</Label>
        <Textarea id="domicileAddress" rows={2} {...register("domicileAddress")} />
        {errors.domicileAddress && (
          <p className="text-destructive text-sm">
            {errors.domicileAddress.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ktpAddress">Alamat KTP</Label>
        <Textarea id="ktpAddress" rows={2} {...register("ktpAddress")} />
        {errors.ktpAddress && (
          <p className="text-destructive text-sm">
            {errors.ktpAddress.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="emergencyContactName">Nama Kontak Darurat</Label>
          <Input id="emergencyContactName" {...register("emergencyContactName")} />
          {errors.emergencyContactName && (
            <p className="text-destructive text-sm">
              {errors.emergencyContactName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="emergencyContactRelation">Hubungan Keluarga</Label>
          <Input
            id="emergencyContactRelation"
            placeholder="Contoh: Suami, Orang tua"
            {...register("emergencyContactRelation")}
          />
          {errors.emergencyContactRelation && (
            <p className="text-destructive text-sm">
              {errors.emergencyContactRelation.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="emergencyContactPhone">Nomor Telepon</Label>
          <Input
            id="emergencyContactPhone"
            inputMode="tel"
            {...register("emergencyContactPhone")}
          />
          {errors.emergencyContactPhone && (
            <p className="text-destructive text-sm">
              {errors.emergencyContactPhone.message}
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
