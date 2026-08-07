import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginDTO = z.infer<typeof LoginSchema>;
