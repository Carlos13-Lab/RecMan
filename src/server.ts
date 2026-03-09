import "dotenv/config";
import { app } from "./app";
import { AppDataSource } from "./config/data-source";
import { NotificationService } from "./modules/notifications/notification.service";

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 4000;

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connected");

    // Inicializar Firebase Admin para notificaciones
    NotificationService.initialize();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 RecMan API listening on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error during AppDataSource initialization", err);
    process.exit(1);
  }
}

bootstrap();

