# Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Server Configuration
HOST=0.0.0.0
PORT=4000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=12345678
DB_NAME=recman_db

# JWT Authentication
# Generate a secure random string for JWT_SECRET (at least 32 characters)
# Example: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# Generate a secure random string for JWT_ENCRYPTION_KEY (at least 32 characters)
# Example: openssl rand -base64 32
JWT_ENCRYPTION_KEY=your-super-secret-encryption-key-32-chars-min

# Firebase Configuration (Optional - for push notifications)
# Option 1: Path to Firebase service account JSON file
# Place your firebase-service-account.json in src/config/
# The service will automatically detect it

# Option 2: Firebase service account as JSON string (alternative to file)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Exchange Rate API (Optional)
# Default: https://ve.dolarapi.com/v1/dolares/oficial
EXCHANGE_RATE_API_URL=https://ve.dolarapi.com/v1/dolares/oficial

# Development Mode (Optional)
# Set to "true" to skip authentication in development
SKIP_AUTH=false
# Development user ID (used when SKIP_AUTH=true)
DEV_USER_ID=00000000-0000-0000-0000-000000000001
```

## Generar Claves Secretas

Para generar claves seguras para JWT:

```bash
# En Linux/Mac
openssl rand -base64 32

# En Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Notas Importantes

- **NUNCA** subas el archivo `.env` al repositorio
- El archivo `.env` está incluido en `.gitignore`
- Para Firebase, puedes usar un archivo JSON en `src/config/firebase-service-account.json` o la variable de entorno `FIREBASE_SERVICE_ACCOUNT`
- El archivo `firebase-service-account.json` también está en `.gitignore`
