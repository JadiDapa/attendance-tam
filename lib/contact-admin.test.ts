import { describe, expect, it } from "vitest";

import { ADMIN_CONTACT_EMAIL, contactAdminMailto } from "@/lib/contact-admin";

/** Membaca balik mailto seperti yang dilakukan aplikasi email. */
function openInMailClient(href: string) {
  const [address, query] = href.replace(/^mailto:/, "").split("?");
  const params = Object.fromEntries(
    query.split("&").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, decodeURIComponent(value)];
    }),
  );
  return { address, subject: params.subject, body: params.body, query };
}

describe("Hubungi Admin: email permohonan akun", () => {
  it("ditujukan ke email admin resmi", () => {
    expect(ADMIN_CONTACT_EMAIL).toBe("admin@tarunagroup.co.id");
    expect(openInMailClient(contactAdminMailto()).address).toBe(
      "admin@tarunagroup.co.id",
    );
  });

  it("subjek sudah terisi", () => {
    expect(openInMailClient(contactAdminMailto()).subject).toBe(
      "Permohonan pembuatan akun absensi",
    );
  });

  it("isi email memuat template Nama, Email, No. HP, Jabatan, Divisi berurutan", () => {
    const { body } = openInMailClient(contactAdminMailto());

    expect(body).toContain("Nama:\nEmail:\nNo. HP:\nJabatan:\nDivisi:");
  });

  it("spasi dan baris baru di-encode sebagai %20 / %0A, bukan + (aplikasi email menampilkan + apa adanya)", () => {
    const { query } = openInMailClient(contactAdminMailto());

    expect(query).not.toContain("+");
    expect(query).toContain("%20");
    expect(query).toContain("%0A");
  });
});
