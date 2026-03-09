import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Ingredient } from "./ingredient.entity";
import { CreateIngredientDto, UpdateIngredientDto } from "./ingredient.schema";

const ingredientRepository = AppDataSource.getRepository(Ingredient);

export class IngredientController {
  static async list(_req: Request, res: Response) {
    const ingredients = await ingredientRepository.find();
    return res.json(ingredients);
  }

  static async get(req: Request, res: Response) {
    const { id } = req.params;
    const ingredient = await ingredientRepository.findOne({ where: { id } });
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    return res.json(ingredient);
  }

  static async create(req: Request, res: Response) {
    const body =
      (req.validated?.body as CreateIngredientDto | undefined) ??
      (req.body as CreateIngredientDto);

    const ingredient = ingredientRepository.create({
      name: body.name,
      unit: body.unit,
      priceUsd: body.priceUsd.toString(),
      currentStock: body.currentStock?.toString() ?? "0",
      minStock: body.minStock?.toString() ?? "0",
      category: body.category ?? null
    });

    await ingredientRepository.save(ingredient);
    return res.status(201).json(ingredient);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const body =
      (req.validated?.body as UpdateIngredientDto | undefined) ??
      (req.body as UpdateIngredientDto);

    const ingredient = await ingredientRepository.findOne({ where: { id } });
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    if (body.name !== undefined) ingredient.name = body.name;
    if (body.unit !== undefined) ingredient.unit = body.unit;
    if (body.priceUsd !== undefined)
      ingredient.priceUsd = body.priceUsd.toString();
    if (body.currentStock !== undefined)
      ingredient.currentStock = body.currentStock.toString();
    if (body.minStock !== undefined)
      ingredient.minStock = body.minStock.toString();
    if (body.category !== undefined) ingredient.category = body.category ?? null;

    await ingredientRepository.save(ingredient);
    return res.json(ingredient);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    const ingredient = await ingredientRepository.findOne({ where: { id } });
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    await ingredientRepository.remove(ingredient);
    return res.status(204).send();
  }
}

