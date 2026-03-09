import { Router } from "express";
import { SaleController } from "./sale.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { validate } from "../../shared/middlewares/validation.middleware";
import { createSaleSchema } from "./sale.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", SaleController.list);
router.post("/", validate(createSaleSchema), SaleController.create);

export default router;

