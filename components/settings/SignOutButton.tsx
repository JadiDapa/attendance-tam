"use client";

import { ExitIcon as LogOut } from "@radix-ui/react-icons";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button
      type="button"
      variant="destructive"
      className="rounded-xl"
      onClick={() => signOut({ redirectTo: "/login" })}
    >
      <LogOut className="size-4" />
      Keluar dari Akun
    </Button>
  );
}
