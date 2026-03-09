import { Router } from "express";
import { RecipeController } from "./recipe.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { validate } from "../../shared/middlewares/validation.middleware";
import { validateUuidParam } from "../../shared/middlewares/uuid-validation.middleware";
import { createRecipeSchema, updateRecipeSchema } from "./recipe.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", RecipeController.list);
router.get("/:id", validateUuidParam(), RecipeController.get);
router.post("/", validate(createRecipeSchema), RecipeController.create);
router.put("/:id", validateUuidParam(), validate(updateRecipeSchema), RecipeController.update);
router.delete("/:id", validateUuidParam(), RecipeController.remove);

export default router;

