import { AppDataSource } from "../../config/data-source";
import { User } from "./user.entity";
import { VerifyAuthDto } from "./auth.schema";
import * as jose from "jose";
import { AppError } from "../../shared/errors/AppError";

const userRepository = AppDataSource.getRepository(User);

function getJwtSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.JWT_ENCRYPTION_KEY;

  if (!jwtSecret || !encryptionKey) {
    throw new Error("JWT_SECRET and JWT_ENCRYPTION_KEY must be set");
  }

  if (encryptionKey.length < 32) {
    throw new Error("JWT_ENCRYPTION_KEY must be at least 32 characters");
  }

  const signingKey = new TextEncoder().encode(jwtSecret);
  const encKey = new TextEncoder().encode(encryptionKey.slice(0, 32));

  return { signingKey, encKey };
}

export class AuthService {
  // Verificar si el usuario existe (GET)
  static async verifyUser(uuid: string): Promise<{ exists: boolean; user?: User }> {
    const user = await userRepository.findOne({ where: { id: uuid } });
    
    if (!user) {
      return { exists: false };
    }
    
    return { exists: true, user };
  }

  // Login para usuario existente (devuelve token)
  static async loginUser(uuid: string): Promise<string> {
    const user = await userRepository.findOne({ where: { id: uuid } });
    
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const token = await this.generateEncryptedToken({ sub: user.id });
    return token;
  }

  // Registrar nuevo usuario (POST)
  static async registerUser(payload: VerifyAuthDto): Promise<string> {
    const { uuid, deviceInfo } = payload;

    // Verificar que no exista
    const existingUser = await userRepository.findOne({ where: { id: uuid } });
    if (existingUser) {
      throw new AppError("User already exists", 409);
    }

    // Crear nuevo usuario
    const user = userRepository.create({
      id: uuid,
      deviceInfo: deviceInfo ?? null
    });
    await userRepository.save(user);

    // Generar token
    const token = await this.generateEncryptedToken({ sub: user.id });
    return token;
  }

  static async generateEncryptedToken(payload: jose.JWTPayload): Promise<string> {
    const { signingKey, encKey } = getJwtSecrets();
    const now = Math.floor(Date.now() / 1000);

    const jwe = await new jose.EncryptJWT({
      ...payload,
      iat: now,
      exp: now + 60 * 60 * 24 * 7 // 7 días
    })
      .setProtectedHeader({
        alg: "dir",
        enc: "A256GCM"
      })
      .encrypt(encKey);

    return jwe;
  }

  static async verifyEncryptedToken(token: string): Promise<jose.JWTPayload> {
    const { encKey } = getJwtSecrets();

    try {
      const { payload } = await jose.jwtDecrypt(token, encKey);
      return payload;
    } catch (err) {
      throw new AppError("Invalid or expired token", 401);
    }
  }
}

