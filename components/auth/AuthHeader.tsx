import Image from "next/image";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="">
      <div className="flex items-end justify-center gap-3">
        <Image src="/icon.webp" alt="Logo" width={100} height={20} />

        <p className="letter truncate text-4xl font-semibold tracking-wide">
          ABSENSI
        </p>
      </div>
      <h1 className="text-primary mt-6 text-center text-3xl font-medium lg:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm">{subtitle}</p>
    </div>
  );
}
