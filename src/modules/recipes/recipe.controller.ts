import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Recipe } from "./recipe.entity";
import { RecipeIngredient } from "./recipe-ingredient.entity";
import { Ingredient } from "../ingredients/ingredient.entity";
import { CreateRecipeDto, UpdateRecipeDto } from "./recipe.schema";
import { AppError } from "../../shared/errors/AppError";
import { ExchangeRateService } from "../../shared/services/exchangeRate.service";
import { calculateRecipePricing } from "../../shared/utils/recipe.utils";

const recipeRepository = AppDataSource.getRepository(Recipe);
const recipeIngredientRepository = AppDataSource.getRepository(RecipeIngredient);
const ingredientRepository = AppDataSource.getRepository(Ingredient);

function mapRecipeWithPricing(recipe: Recipe & {
  ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
}) {
  const pricing = calculateRecipePricing(
    recipe.ingredients.map(ri => ({
      priceUsd: ri.ingredient.priceUsd,
      quantity: ri.quantity
    })),
    recipe.profitPercentage
  );

  return {
    ...recipe,
    costUsd: pricing.costUsd,
    priceUsd: pricing.priceUsd
  };
}

export class RecipeController {
  static async list(req: Request, res: Response) {
    const userId = req.userId as string;
    const recipes = await recipeRepository.find({
      where: { userId },
      relations: ["ingredients", "ingredients.ingredient"]
    });

    const recipesWithPricing = recipes.map((r) =>
      mapRecipeWithPricing(
        r as Recipe & {
          ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
        }
      )
    );

    // Para no hacer muchas llamadas a la API, calculamos Bs con una sola tasa
    const rate = await ExchangeRateService.getExchangeRate();

    const result = recipesWithPricing.map((r) => ({
      ...r,
      costBs: r.costUsd * rate,
      priceBs: r.priceUsd * rate
    }));

    return res.json(result);
  }

  static async get(req: Request, res: Response) {
    const userId = req.userId as string;
    const { id } = req.params;
    const recipe = await recipeRepository.findOne({
      where: { id, userId },
      relations: ["ingredients", "ingredients.ingredient"]
    });
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    const mapped = mapRecipeWithPricing(
      recipe as Recipe & {
        ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
      }
    );

    const rate = await ExchangeRateService.getExchangeRate();

    const result = {
      ...mapped,
      costBs: mapped.costUsd * rate,
      priceBs: mapped.priceUsd * rate
    };

    return res.json(result);
  }

  static async create(req: Request, res: Response) {
    const userId = req.userId as string;
    const body =
      (req.validated?.body as CreateRecipeDto | undefined) ??
      (req.body as CreateRecipeDto);

    // Validate no duplicate ingredients
    const ingredientIds = body.ingredients.map(ri => ri.ingredientId);
    const uniqueIds = new Set(ingredientIds);
    if (ingredientIds.length !== uniqueIds.size) {
      throw new AppError("Duplicate ingredients are not allowed", 400);
    }

    // Use transaction for atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const recipe = recipeRepository.create({
        userId,
        name: body.name,
        description: body.description ?? null,
        profitPercentage: body.profitPercentage.toString(),
        category: body.category ?? null,
        baseServings: body.baseServings ?? 1,
        notes: body.notes ?? null
      });

      await queryRunner.manager.save(recipe);

      // Validate all ingredients exist before creating recipe ingredients
      const ingredientIdsToCheck = body.ingredients.map(ri => ri.ingredientId);
      const existingIngredients = await queryRunner.manager.find(Ingredient, {
        where: ingredientIdsToCheck.map(id => ({ id }))
      });

      if (existingIngredients.length !== ingredientIdsToCheck.length) {
        const foundIds = new Set(existingIngredients.map(ing => ing.id));
        const missingIds = ingredientIdsToCheck.filter(id => !foundIds.has(id));
        throw new AppError(
          `Ingredients not found: ${missingIds.join(", ")}`,
          400
        );
      }

      // Create recipe ingredients
      for (const ri of body.ingredients) {
        const recipeIngredient = recipeIngredientRepository.create({
          recipeId: recipe.id,
          ingredientId: ri.ingredientId,
          quantity: ri.quantity.toString()
        });
        await queryRunner.manager.save(recipeIngredient);
      }

      await queryRunner.commitTransaction();

      // Fetch complete recipe with relations
      const created = await recipeRepository.findOne({
        where: { id: recipe.id },
        relations: ["ingredients", "ingredients.ingredient"]
      });

      if (!created) {
        return res.status(201).json(recipe);
      }

      const mapped = mapRecipeWithPricing(
        created as Recipe & {
          ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
        }
      );
      const rate = await ExchangeRateService.getExchangeRate();

      const result = {
        ...mapped,
        costBs: mapped.costUsd * rate,
        priceBs: mapped.priceUsd * rate
      };

      return res.status(201).json(result);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  static async update(req: Request, res: Response) {
    const userId = req.userId as string;
    const { id } = req.params;
    const body =
      (req.validated?.body as UpdateRecipeDto | undefined) ??
      (req.body as UpdateRecipeDto);

    const recipe = await recipeRepository.findOne({
      where: { id, userId },
      relations: ["ingredients"]
    });

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Validate no duplicate ingredients if updating ingredients
    if (body.ingredients) {
      const ingredientIds = body.ingredients.map(ri => ri.ingredientId);
      const uniqueIds = new Set(ingredientIds);
      if (ingredientIds.length !== uniqueIds.size) {
        throw new AppError("Duplicate ingredients are not allowed", 400);
      }
    }

    // Use transaction for atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update recipe fields
      if (body.name !== undefined) recipe.name = body.name;
      if (body.description !== undefined)
        recipe.description = body.description ?? null;
      if (body.profitPercentage !== undefined)
        recipe.profitPercentage = body.profitPercentage.toString();
      if (body.category !== undefined) recipe.category = body.category ?? null;
      if (body.baseServings !== undefined)
        recipe.baseServings = body.baseServings;
      if (body.notes !== undefined) recipe.notes = body.notes ?? null;

      await queryRunner.manager.save(recipe);

      // Update ingredients if provided
      if (body.ingredients) {
        await queryRunner.manager.delete(RecipeIngredient, {
          recipeId: recipe.id
        });

        // Validate all ingredients exist
        const ingredientIdsToCheck = body.ingredients.map(ri => ri.ingredientId);
        const existingIngredients = await queryRunner.manager.find(Ingredient, {
          where: ingredientIdsToCheck.map(id => ({ id }))
        });

        if (existingIngredients.length !== ingredientIdsToCheck.length) {
          const foundIds = new Set(existingIngredients.map(ing => ing.id));
          const missingIds = ingredientIdsToCheck.filter(id => !foundIds.has(id));
          throw new AppError(
            `Ingredients not found: ${missingIds.join(", ")}`,
            400
          );
        }

        // Create new recipe ingredients
        for (const ri of body.ingredients) {
          const recipeIngredient = recipeIngredientRepository.create({
            recipeId: recipe.id,
            ingredientId: ri.ingredientId,
            quantity: ri.quantity.toString()
          });
          await queryRunner.manager.save(recipeIngredient);
        }
      }

      await queryRunner.commitTransaction();

      // Fetch complete recipe with relations
      const updated = await recipeRepository.findOne({
        where: { id: recipe.id },
        relations: ["ingredients", "ingredients.ingredient"]
      });

      if (!updated) {
        return res.json(recipe);
      }

      const mapped = mapRecipeWithPricing(
        updated as Recipe & {
          ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
        }
      );
      const rate = await ExchangeRateService.getExchangeRate();

      const result = {
        ...mapped,
        costBs: mapped.costUsd * rate,
        priceBs: mapped.priceUsd * rate
      };

      return res.json(result);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  static async remove(req: Request, res: Response) {
    const userId = req.userId as string;
    const { id } = req.params;

    const recipe = await recipeRepository.findOne({ where: { id, userId } });
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    await recipeRepository.remove(recipe);
    return res.status(204).send();
  }
}

