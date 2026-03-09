import { z } from "zod";

export const createSaleSchema = z.object({
  recipeId: z.string().uuid(),
  quantity: z.number().int().positive(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in format YYYY-MM-DD")
    .optional() // opcional -> backend puede usar hoy
});

export type CreateSaleDto = z.infer<typeof createSaleSchema>;

