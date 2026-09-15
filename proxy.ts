import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Hanya menjamin user sudah login (tanpa database) — pengecekan role & status
// aktif tetap dilakukan di layout/server action lewat lib/session.ts.
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/forgot-password(.*)",
  "/reset-password(.*)",
]);

export default clerkMiddleware(async (authFn, req) => {
  const { pathname } = req.nextUrl;

  // Route handler API sudah mengecek auth sendiri lewat lib/session.ts
  // (mis. app/api/images, app/api/laporan) — middleware di sini cuma perlu
  // jalan supaya Clerk auth() punya context, bukan ikut menegakkan redirect.
  // Clerk mewajibkan middleware jalan di semua request (termasuk API) supaya
  // auth() di server punya context — beda dari NextAuth yang baca cookie langsung.
  if (pathname.startsWith("/api")) return NextResponse.next();

  const { userId } = await authFn();

  if (!userId) {
    if (isPublicRoute(req)) return NextResponse.next();

    const loginUrl = new URL("/login", req.nextUrl);

    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // Sudah login: halaman login diarahkan ke dashboard oleh app/page.tsx.
  if (isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Semua route kecuali internal Next.js dan file statis — API route TETAP
    // ikut matcher ini (Clerk butuh middleware jalan di sana), tapi
    // di-skip lebih awal di dalam handler.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // File-extension exclusion di atas ikut mengecualikan /api/images/*.jpg dkk
    // (regex tidak peduli prefix path), padahal route itu butuh Clerk auth()
    // context. Baris ini memaksa semua /api/* tetap match terlepas ekstensinya.
    "/(api)(.*)",
  ],
};
