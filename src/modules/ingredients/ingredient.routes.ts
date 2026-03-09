import { Router } from "express";
import { IngredientController } from "./ingredient.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { validate } from "../../shared/middlewares/validation.middleware";
import { validateUuidParam } from "../../shared/middlewares/uuid-validation.middleware";
import {
  createIngredientSchema,
  updateIngredientSchema
} from "./ingredient.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", IngredientController.list);
router.get("/:id", validateUuidParam(), IngredientController.get);
router.post("/", validate(createIngredientSchema), IngredientController.create);
router.put("/:id", validateUuidParam(), validate(updateIngredientSchema), IngredientController.update);
router.delete("/:id", validateUuidParam(), IngredientController.remove);

export default router;

