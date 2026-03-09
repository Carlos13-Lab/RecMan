import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validate } from "../../shared/middlewares/validation.middleware";
import { verifyAuthSchema } from "./auth.schema";
import { validateUuidParam } from "../../shared/middlewares/uuid-validation.middleware";

const router = Router();

// GET - Verificar si el usuario existe
router.get("/verify/:uuid", validateUuidParam("uuid"), AuthController.verify);

// POST - Registrar nuevo usuario
router.post("/register", validate(verifyAuthSchema), AuthController.register);

// POST - Login para usuario existente
router.post("/login/:uuid", validateUuidParam("uuid"), AuthController.login);

export default router;

