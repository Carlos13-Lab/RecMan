import { z } from "zod";

export const verifyAuthSchema = z.object({
  uuid: z.string().uuid(),
  deviceInfo: z
    .object({
      model: z.string().optional(),
      os: z.string().optional(),
      version: z.string().optional()
    })
    .partial()
    .optional()
});

export type VerifyAuthDto = z.infer<typeof verifyAuthSchema>;

