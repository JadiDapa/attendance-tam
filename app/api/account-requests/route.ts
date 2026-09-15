import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { CreateAccountRequestSchema } from "@/servers/validators/account-request.validator";
import { AccountRequestService } from "@/servers/services/account-request.service";
import { UserService } from "@/servers/services/user.service";

/**
 * Endpoint publik (tanpa auth) — dipanggil mobile app sebelum user punya
 * sesi Clerk sama sekali, dari layar "Ajukan pembuatan akun". Admin yang
 * memutuskan approve/reject lewat dashboard (app/action/account-request.action.ts).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = CreateAccountRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const { name, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existingUser = await UserService.getByEmail(email);

  if (existingUser) {
    return NextResponse.json(
      { error: "Email sudah terdaftar. Silakan masuk." },
      { status: 409 },
    );
  }

  const pendingRequest = await AccountRequestService.findPendingByEmail(email);

  if (pendingRequest) {
    return NextResponse.json(
      {
        error:
          "Permintaan pembuatan akun untuk email ini masih menunggu persetujuan admin.",
      },
      { status: 409 },
    );
  }

  await AccountRequestService.create({
    name,
    email,
    phone: phone ? phone.trim() : null,
    passwordEncrypted: encryptSecret(password),
  });

  return NextResponse.json(
    { message: "Permintaan berhasil dikirim, menunggu persetujuan admin." },
    { status: 201 },
  );
}
