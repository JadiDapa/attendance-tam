"use client";

import { CopyIcon, MailIcon } from "lucide-react";
import { toast } from "sonner";

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
import {
  ADMIN_CONTACT_EMAIL,
  CONTACT_ADMIN_DESCRIPTION,
  CONTACT_ADMIN_TITLE,
  contactAdminMailto,
} from "@/lib/contact-admin";

/**
 * Pengganti form request account publik: akun hanya dibuat admin, jadi calon
 * karyawan diarahkan menghubungi admin lewat email.
 */
export default function ContactAdminDialog() {
  const copyEmail = async () => {
    try {
      // `navigator.clipboard` tidak ada di konteks tidak aman (http non-localhost)
      // dan bisa ditolak izin browser — keduanya berakhir di toast error.
      await navigator.clipboard.writeText(ADMIN_CONTACT_EMAIL);
      toast.success("Email admin disalin");
    } catch {
      toast.error("Gagal menyalin. Salin email admin secara manual.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-primary cursor-pointer font-medium hover:underline"
        >
          Hubungi admin
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{CONTACT_ADMIN_TITLE}</DialogTitle>
          <DialogDescription>{CONTACT_ADMIN_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted flex items-center justify-between gap-2 rounded-md border px-3 py-2">
          <span className="truncate font-mono text-sm select-all">
            {ADMIN_CONTACT_EMAIL}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyEmail}
            aria-label="Salin email admin"
          >
            <CopyIcon />
            Salin
          </Button>
        </div>

        <DialogFooter>
          <Button asChild className="w-full sm:w-auto">
            <a href={contactAdminMailto()}>
              <MailIcon />
              Kirim email
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
