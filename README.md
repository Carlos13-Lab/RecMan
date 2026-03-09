# RecMan API

API REST backend para **RecMan** - Sistema de gestión de recetas y ventas para negocios de comida.

## 🚀 Características

- **Autenticación segura**: Sistema de autenticación basado en JWT con encriptación JWE
- **Gestión de recetas**: CRUD completo de recetas con cálculo automático de costos y márgenes de ganancia
- **Control de inventario**: Gestión de ingredientes con seguimiento de stock y alertas de bajo inventario
- **Registro de ventas**: Sistema completo para registrar y consultar ventas diarias
- **Dashboard de métricas**: Endpoints para estadísticas de ingresos, ventas y rendimiento
- **Calendario de ventas**: Consulta de ventas por fecha y rangos temporales
- **Notificaciones push**: Integración con Firebase Cloud Messaging para alertas en tiempo real
- **Tipo de cambio**: Integración con API externa para conversión USD/BS automática

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **ORM**: TypeORM
- **Base de datos**: PostgreSQL
- **Validación**: Zod
- **Autenticación**: JWT/JWE (jose)
- **Notificaciones**: Firebase Admin SDK
- **Cache**: node-cache

## 📦 Módulos

- `/api/auth` - Autenticación y registro de usuarios
- `/api/recipes` - Gestión de recetas
- `/api/ingredients` - Gestión de ingredientes e inventario
- `/api/sales` - Registro y consulta de ventas
- `/api/dashboard` - Métricas y estadísticas
- `/api/calendar` - Consultas de ventas por fecha
- `/api/notifications` - Sistema de notificaciones push

## 🚦 Inicio Rápido

### Prerrequisitos

- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)
- npm o yarn

### Instalación

1. **Clonar el repositorio**:
```bash
git clone <repository-url>
cd RecMan
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
```bash
# Copiar el archivo de ejemplo (ver ENV_SETUP.md para más detalles)
cp ENV_SETUP.md .env
# Editar .env con tus credenciales
```

Ver [ENV_SETUP.md](./ENV_SETUP.md) para la lista completa de variables de entorno necesarias.

4. **Configurar base de datos**:
```bash
# Opción 1: Usar Docker Compose
docker-compose up -d

# Opción 2: Usar PostgreSQL local
# Crear base de datos: createdb recman_db
```

5. **Ejecutar migraciones**:
```bash
npm run migration:run
```

6. **Iniciar servidor de desarrollo**:
```bash
npm run dev
```

7. **Verificar salud del servidor**:
```bash
curl http://localhost:4000/health
```

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor en modo desarrollo con hot-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia servidor en producción
- `npm run migration:run` - Ejecuta migraciones pendientes
- `npm run migration:revert` - Revierte última migración
- `npm run seed` - Ejecuta script de seed para datos de prueba

## 🏗️ Arquitectura

El proyecto sigue una arquitectura modular con separación de responsabilidades:

```
src/
├── modules/          # Módulos de negocio (auth, recipes, sales, etc.)
│   ├── auth/        # Autenticación y usuarios
│   ├── recipes/     # Gestión de recetas
│   ├── ingredients/ # Gestión de ingredientes
│   ├── sales/       # Registro de ventas
│   ├── dashboard/   # Métricas y estadísticas
│   ├── calendar/    # Consultas por fecha
│   └── notifications/ # Notificaciones push
├── config/          # Configuración de base de datos y servicios
├── shared/          # Utilidades compartidas (errores, middlewares, utils)
├── migrations/      # Migraciones de base de datos
└── scripts/         # Scripts de utilidad (seed, etc.)
```

## 🔐 Seguridad

- Autenticación basada en tokens JWT con encriptación JWE
- Validación de datos de entrada con Zod
- Middleware de autenticación para rutas protegidas
- Manejo centralizado de errores
- CORS configurado

## 📊 Base de Datos

El proyecto utiliza PostgreSQL con TypeORM para el manejo de entidades y migraciones. Las principales entidades incluyen:

- `User` - Usuarios del sistema
- `Recipe` - Recetas con ingredientes y precios
- `Ingredient` - Ingredientes con stock y precios
- `Sale` - Registro de ventas
- `Notification` - Notificaciones push

## 🔔 Notificaciones

El sistema incluye notificaciones push mediante Firebase Cloud Messaging (FCM) para alertas de:
- Stock bajo de ingredientes
- Recordatorios de ventas
- Actualizaciones del sistema

Ver [NOTIFICATIONS_SETUP.md](./NOTIFICATIONS_SETUP.md) para más detalles.

## 📄 Licencia

[Especificar licencia si aplica]

## 🤝 Contribuir

[Instrucciones de contribución si aplica]
