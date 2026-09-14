"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { upsertWorkHistory } from "@/app/action/employee-profile.action";
import {
  WorkHistorySchema,
  type WorkHistoryInput,
} from "@/servers/validators/employee-profile.validator";

type Props = {
  initial: {
    previousCompany: string;
    previousPosition: string;
    previousDuration: string;
  };
  targetUserId?: string;
};

export default function WorkHistoryForm({ initial, targetUserId }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<WorkHistoryInput>({
    resolver: zodResolver(WorkHistorySchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await upsertWorkHistory(values, targetUserId);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-xs">
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

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Simpan
        </Button>
      </div>
    </form>
  );
}
