import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Registrar token FCM
router.post("/register-token", NotificationController.registerToken);

// Obtener notificaciones
router.get("/", NotificationController.getNotifications);

// Marcar notificación como leída
router.put("/:id/read", NotificationController.markAsRead);

// Marcar todas como leídas
router.put("/read-all", NotificationController.markAllAsRead);

// Endpoints manuales para verificar (también se pueden ejecutar con cron)
router.post("/check-low-stock", NotificationController.checkLowStock);
router.post("/check-deliveries", NotificationController.checkDeliveries);

export default router;
