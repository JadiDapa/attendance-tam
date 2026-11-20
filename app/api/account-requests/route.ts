import { NextResponse } from "next/server";
import { ACCOUNT_REQUEST_CLOSED_MESSAGE } from "@/lib/contact-admin";

/**
 * Pendaftaran mandiri ditutup — akun hanya dibuat admin. Endpoint ini tetap ada
 * karena mobile 1.1.0 masih memanggilnya dari layar "Ajukan pembuatan akun";
 * 410 + `{ error }` (bentuk error API yang sudah dibaca mobile) ditampilkan
 * apa adanya ke pengguna. Body tidak dibaca sama sekali.
 */
export function POST() {
  return NextResponse.json(
    { error: ACCOUNT_REQUEST_CLOSED_MESSAGE },
    { status: 410 },
  );
}
