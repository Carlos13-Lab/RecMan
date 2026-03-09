import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  priceUsd: z.number().positive(),
  currentStock: z.number().nonnegative().default(0),
  minStock: z.number().nonnegative().default(0),
  category: z.string().optional()
});

export const updateIngredientSchema = createIngredientSchema.partial();

export type CreateIngredientDto = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientDto = z.infer<typeof updateIngredientSchema>;

