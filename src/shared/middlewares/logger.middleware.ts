import { Request, Response, NextFunction } from "express";

// Colores para la consola (ANSI escape codes)
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function getColorForMethod(method: string): string {
  switch (method) {
    case "GET":
      return colors.blue;
    case "POST":
      return colors.green;
    case "PUT":
      return colors.yellow;
    case "PATCH":
      return colors.magenta;
    case "DELETE":
      return colors.red;
    default:
      return colors.reset;
  }
}

function getColorForStatus(status: number): string {
  if (status >= 200 && status < 300) return colors.green;
  if (status >= 300 && status < 400) return colors.cyan;
  if (status >= 400 && status < 500) return colors.yellow;
  if (status >= 500) return colors.red;
  return colors.reset;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userId = (req as any).userId || "anonymous";
  const userAgent = req.get("user-agent") || "unknown";
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // Log de inicio de petición
  const methodColor = getColorForMethod(method);
  console.log(
    `${colors.dim}[${formatTimestamp()}]${colors.reset} ` +
      `${methodColor}${method}${colors.reset} ` +
      `${colors.bright}${url}${colors.reset} ` +
      `${colors.dim}(IP: ${ip})${colors.reset}`
  );

  // Log del body (si existe y no es muy grande)
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.length < 500) {
      console.log(`${colors.dim}  Body: ${bodyStr}${colors.reset}`);
    } else {
      console.log(
        `${colors.dim}  Body: ${bodyStr.substring(0, 500)}... (truncated)${colors.reset}`
      );
    }
  }

  // Log de query params (si existen)
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(
      `${colors.dim}  Query: ${JSON.stringify(req.query)}${colors.reset}`
    );
  }

  // Log de userId si está autenticado
  if (userId !== "anonymous") {
    console.log(`${colors.dim}  UserId: ${userId}${colors.reset}`);
  }

  // Interceptar el método `end` de la respuesta para registrar el status y tiempo
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const statusColor = getColorForStatus(status);

    // Log de respuesta
    console.log(
      `${colors.dim}[${formatTimestamp()}]${colors.reset} ` +
        `${methodColor}${method}${colors.reset} ` +
        `${colors.bright}${url}${colors.reset} ` +
        `${statusColor}${status}${colors.reset} ` +
        `${colors.dim}(${formatDuration(duration)})${colors.reset}`
    );

    // Llamar al método original con los argumentos correctos
    if (cb) {
      return originalEnd(chunk, encoding, cb);
    } else if (encoding) {
      return originalEnd(chunk, encoding);
    } else if (chunk) {
      return originalEnd(chunk);
    } else {
      return originalEnd();
    }
  };

  next();
}
