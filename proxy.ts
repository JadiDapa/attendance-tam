import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, defaultRouteForRole } from "./auth.config";

// Hanya membaca session dari cookie (tanpa database) — pengecekan sebenarnya
// tetap dilakukan di layout/server action lewat lib/session.ts.
const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login"];
const EMPLOYEE_ROUTES = ["/dashboard", "/riwayat", "/izin", "/koreksi"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!user) {
    if (isPublicRoute) return NextResponse.next();

    const loginUrl = new URL("/login", req.nextUrl);

    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(loginUrl);
  }

  const homeRoute = defaultRouteForRole(user.role);

  // Sudah login: halaman login dan root tidak relevan lagi.
  if (isPublicRoute || pathname === "/") {
    return NextResponse.redirect(new URL(homeRoute, req.nextUrl));
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isEmployeeRoute = EMPLOYEE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (user.role === "ADMIN" && isEmployeeRoute) {
    return NextResponse.redirect(new URL(homeRoute, req.nextUrl));
  }

  if (user.role === "EMPLOYEE" && isAdminRoute) {
    return NextResponse.redirect(new URL(homeRoute, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Semua route kecuali internal Next.js, API, dan file statis.
    "/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
