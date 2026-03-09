import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AppError } from "../../shared/errors/AppError";
import { AppDataSource } from "../../config/data-source";
import { User } from "./user.entity";

const userRepository = AppDataSource.getRepository(User);

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const skipAuth = process.env.SKIP_AUTH === "true";

  if (skipAuth) {
    // Modo desarrollo: no pedimos token, usamos un userId fijo
    const devUserId =
      process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

    // Crear usuario dev automáticamente si no existe
    let devUser = await userRepository.findOne({ where: { id: devUserId } });
    if (!devUser) {
      devUser = userRepository.create({
        id: devUserId,
        deviceInfo: {
          model: "Dev Device",
          os: "Development",
          version: "1.0.0"
        }
      });
      await userRepository.save(devUser);
    }

    req.userId = devUserId;
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Missing authorization token", 401);
  }

  const token = authHeader.substring("Bearer ".length);
  const payload = await AuthService.verifyEncryptedToken(token);

  if (!payload.sub) {
    throw new AppError("Invalid token payload", 401);
  }

  req.userId = payload.sub as string;

  next();
}

