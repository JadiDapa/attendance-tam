import "@tanstack/table-core";

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Sembunyikan kolom ini di tampilan kartu mobile DataTable — dipakai kolom
     * "Aksi" yang jadi berlebihan kalau kartunya sendiri sudah bisa di-tap. */
    hiddenInCard?: boolean;
  }
}
