"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  EnvelopeClosedIcon as Mail,
  CopyIcon as Copy,
  CheckIcon as Check,
  InfoCircledIcon as InfoCircle,
} from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ADMIN_EMAIL = "admin@tarunagroup.co.id";

interface ContactAdminDialogProps {
  triggerText?: string;
  triggerClassName?: string;
  children?: React.ReactNode;
}

export default function ContactAdminDialog({
  triggerText = "Hubungi admin",
  triggerClassName = "text-primary font-medium hover:underline cursor-pointer inline-block",
  children,
}: ContactAdminDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      setCopied(true);
      toast.success("Alamat email berhasil disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin email");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <button type="button" className={triggerClassName}>
            {triggerText}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="bg-accent flex size-14 items-center justify-center rounded-full mb-1">
            <Mail className="text-primary size-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Pembuatan Akun Karyawan
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm max-w-xs text-center">
            Pendaftaran akun baru diproses langsung oleh Admin
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          {/* Email Pill - Mengikuti style input form auth project */}
          <div className="border-primary bg-background flex h-10 w-full items-center justify-between rounded-full border-2 px-4 lg:h-12">
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="text-primary-subtle size-5 shrink-0" />
              <span className="truncate text-sm font-medium select-all">
                {ADMIN_EMAIL}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="text-primary-subtle hover:text-primary transition-colors p-1"
              title="Salin email"
              aria-label="Salin email"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs text-center">
            <InfoCircle className="size-4 shrink-0" />
            <span>Sertakan nama lengkap dan divisi kerja Anda.</span>
          </div>

          <Button
            asChild
            className="flex h-10 w-full items-center justify-center gap-2 text-base lg:h-12"
          >
            <a
              href={`mailto:${ADMIN_EMAIL}?subject=Permohonan%20Pembuatan%20Akun%20Presensi%20TAM`}
            >
              <Mail className="size-4" />
              Kirim Email ke Admin
            </a>
          </Button>
        </div>

        <DialogFooter className="mt-1 sm:justify-center">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
            >
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
