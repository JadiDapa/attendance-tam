import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { LoginSchema } from "@/servers/validators/auth.validator";
import { UserService } from "@/servers/services/user.service";

/** Email/password salah — pesan sengaja tidak membedakan keduanya. */
export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** Akun ada tapi sudah dinonaktifkan admin. */
export class InactiveAccountError extends CredentialsSignin {
  code = "inactive_account";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);

        if (!parsed.success) throw new InvalidCredentialsError();

        const user = await UserService.getByEmail(
          parsed.data.email.toLowerCase(),
        );

        if (!user) throw new InvalidCredentialsError();

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatch) throw new InvalidCredentialsError();
        if (!user.isActive) throw new InactiveAccountError();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
