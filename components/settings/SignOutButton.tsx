"use client";

import { ExitIcon as LogOut } from "@radix-ui/react-icons";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <Button
      type="button"
      variant="destructive"
      className="rounded-xl"
      onClick={() => signOut({ redirectUrl: "/login" })}
    >
      <LogOut className="size-4" />
      Keluar dari Akun
    </Button>
  );
}
