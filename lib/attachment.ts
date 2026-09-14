const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** True kalau URL lampiran kemungkinan gambar (bisa dipreview inline), bukan PDF/dokumen lain. */
export function isImageUrl(url: string): boolean {
  const withoutQuery = url.split(/[?#]/)[0].toLowerCase();

  return IMAGE_EXTENSIONS.some((extension) =>
    withoutQuery.endsWith(extension),
  );
}
