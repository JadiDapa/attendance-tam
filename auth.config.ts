import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma";

/**
 * Konfigurasi yang aman dipakai di mana saja (termasuk proxy.ts), karena tidak
 * menyentuh database. Provider credentials-nya ada di `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;

/** Halaman awal tiap role setelah login. */
export function defaultRouteForRole(role: Role) {
  return role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
}
