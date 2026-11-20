import { z } from "zod";
import { Role } from "@/generated/prisma";

/** Diisi admin saat meninjau — role boleh diganti dari default EMPLOYEE. */
export const ReviewAccountRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  role: z.enum(Role).default(Role.EMPLOYEE),
  reviewNote: z.string().trim().max(300).optional().or(z.literal("")),
});

export type ReviewAccountRequestDTO = z.infer<typeof ReviewAccountRequestSchema>;
