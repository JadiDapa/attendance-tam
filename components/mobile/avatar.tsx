import Image from "next/image";

/**
 * Mirrors mobile's `Avatar` — plain circle, photo or initial fallback.
 * Web doesn't need the Bearer-token dance mobile does for `/api/images/*`:
 * the browser already sends the Clerk session cookie along. `unoptimized`
 * because Next's image optimizer fetches server-side without that cookie,
 * which would break auth on `/api/images/[filename]`.
 */
export function Avatar({
  name,
  imageUrl,
  size = 48,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: size / 2 }}
        className="object-cover"
        unoptimized
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-muted flex items-center justify-center"
    >
      <span
        style={{ fontSize: size / 2.2 }}
        className="text-foreground font-bold"
      >
        {initial}
      </span>
    </div>
  );
}
