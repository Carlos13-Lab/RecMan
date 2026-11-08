import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { IMAGE_EXT, RecipeController } from "./recipe.controller";
import { AppError } from "../../shared/errors/AppError";
import { authMiddleware } from "../auth/auth.middleware";
import { validate } from "../../shared/middlewares/validation.middleware";
import { validateUuidParam } from "../../shared/middlewares/uuid-validation.middleware";
import { createRecipeSchema, updateRecipeSchema } from "./recipe.schema";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    IMAGE_EXT[file.mimetype] ? cb(null, true) : cb(new AppError("Only jpeg, png or webp images are allowed", 400))
});

// Turns multer failures (size limit, unexpected field) into 400s instead of 500s.
const uploadImage = (req: Request, res: Response, next: NextFunction) =>
  upload.single("image")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Image exceeds the 5 MB limit" : `Invalid upload: ${err.message}`;
      return next(new AppError(message, 400));
    }
    next(err);
  });

router.use(authMiddleware);

router.get("/", RecipeController.list);
router.get("/:id", validateUuidParam(), RecipeController.get);
router.post("/", validate(createRecipeSchema), RecipeController.create);
router.put("/:id", validateUuidParam(), validate(updateRecipeSchema), RecipeController.update);
router.post("/:id/image", validateUuidParam(), uploadImage, RecipeController.uploadImage);
router.delete("/:id", validateUuidParam(), RecipeController.remove);

export default router;

