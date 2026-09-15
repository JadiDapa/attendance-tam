import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Enkripsi simetris (AES-256-GCM) untuk password mentah yang ditulis pemohon
 * di form "Ajukan pembuatan akun" (mobile) — perlu bisa didekripsi lagi saat
 * admin menyetujui (dipakai membuat akun Clerk), jadi tidak bisa di-hash
 * satu arah seperti password login biasa. Lihat `AccountRequest.passwordEncrypted`.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ACCOUNT_REQUEST_SECRET;

  if (!secret) {
    throw new Error("Missing ACCOUNT_REQUEST_SECRET — set it in .env");
  }

  const key = Buffer.from(secret, "hex");

  if (key.length !== 32) {
    throw new Error(
      "ACCOUNT_REQUEST_SECRET harus 32 byte dalam bentuk hex (64 karakter)",
    );
  }

  return key;
}

/** Hasil: "iv.tag.ciphertext" (masing-masing base64). */
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, ciphertext].map((part) => part.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, ciphertextB64] = payload.split(".");

  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("Payload terenkripsi tidak valid");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
