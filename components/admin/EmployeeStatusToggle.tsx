"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LightningBoltIcon as Power,
  CircleBackslashIcon as PowerOff,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { setEmployeeActive } from "@/app/action/user.action";

type Employee = { id: string; isActive: boolean };

export default function EmployeeStatusToggle({
  employee,
  label = false,
}: {
  employee: Employee;
  /** Tampilkan label teks di sebelah ikon, bukan cuma ikon + title. */
  label?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await setEmployeeActive(employee.id, !employee.isActive);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <Button
      variant={label ? "outline" : "ghost"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={employee.isActive ? "Nonaktifkan" : "Aktifkan"}
    >
      {employee.isActive ? (
        <PowerOff className="size-4" />
      ) : (
        <Power className="size-4" />
      )}
      {label && (employee.isActive ? "Nonaktifkan" : "Aktifkan")}
    </Button>
  );
}
