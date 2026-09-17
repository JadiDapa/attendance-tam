"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PersonIcon as User } from "@radix-ui/react-icons";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { updateProfileImage } from "@/app/action/profile.action";

type Props = {
  name: string;
  imageUrl: string | null;
};

export default function ProfileAvatarForm({ name, imageUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setPending(true);

    const formData = new FormData();
    formData.set("photo", file);

    const result = await updateProfileImage(formData);

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    toast.success(result.message);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-4 sm:col-span-2">
      <Avatar size="lg" className="h-16 w-16">
        {preview ? (
          <AvatarImage src={preview} alt={name} />
        ) : imageUrl ? (
          <AvatarImage src={imageUrl} alt={name} />
        ) : null}
        <AvatarFallback>
          <User className="text-primary-subtle h-6 w-6" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending && <Spinner />}
          Ganti Foto Profil
        </Button>
        <p className="text-muted-foreground text-xs">
          JPG, PNG, atau WEBP, maks 5MB.
        </p>
      </div>
    </div>
  );
}
