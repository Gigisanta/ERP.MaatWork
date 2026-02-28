/**
 * PM2 Ecosystem Configuration for MAATWORK
 *
 * PRODUCCION (maat.work):
 * =======================
 *
 * Las siguientes variables de entorno DEBEN estar configuradas en el servidor
 * antes de ejecutar `pm2 start ecosystem.config.js`:
 *
 * API (.env en apps/api/):
 *   - DATABASE_URL: postgresql://user:pass@host:5432/db
 *   - JWT_SECRET: Secreto de 32+ caracteres
 *   - CORS_ORIGINS: https://maat.work,https://www.maat.work
 *   - FRONTEND_URL: https://maat.work
 *   - COOKIE_DOMAIN: .maat.work
 *   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *   - GOOGLE_ENCRYPTION_KEY: Clave de 32 caracteres para encriptar tokens
 *
 * WEB (.env.local en apps/web/):
 *   - JWT_SECRET: DEBE ser el mismo que en API (para validar tokens en middleware)
 *   - NEXT_PUBLIC_API_URL: https://maat.work/api
 *   - NEXT_PUBLIC_GOOGLE_CLIENT_ID: Client ID de Google
 *   - API_URL_INTERNAL: http://localhost:3001 (para Server Components)
 *
 * Ver:
 *   - apps/api/.env.production.example
 *   - apps/web/.env.production.example
 *
 * Comandos:
 *   pm2 start ecosystem.config.js        # Iniciar todos los servicios
 *   pm2 logs api                          # Ver logs de la API
 *   pm2 restart api                       # Reiniciar API
 *   pm2 save                              # Guardar config para reboot
 */

// Cargar JWT_SECRET desde el .env.local del web si existe
const fs = require('fs');
const path = require('path');

// AI_DECISION: Calcular rutas absolutas para logs
// Justificación: Las rutas relativas en PM2 se resuelven desde donde se ejecuta PM2, no desde cwd
// Impacto: Los logs se escriben correctamente en cada app/logs/ en lugar de ~/.pm2/logs/
const ROOT_DIR = __dirname;
const LOGS_DIR = {
  api: path.join(ROOT_DIR, 'apps/api/logs'),
  web: path.join(ROOT_DIR, 'apps/web/logs'),
  analytics: path.join(ROOT_DIR, 'apps/analytics-service/logs'),
};

// Asegurar que los directorios de logs existan
Object.values(LOGS_DIR).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

let jwtSecret = '';

// Intentar cargar JWT_SECRET desde apps/api/.env (Fuente de verdad)
try {
  const apiEnvPath = path.join(ROOT_DIR, 'apps/api/.env');
  if (fs.existsSync(apiEnvPath)) {
    const envContent = fs.readFileSync(apiEnvPath, 'utf8');
    const match = envContent.match(/JWT_SECRET=(.+)/);
    if (match) {
      jwtSecret = match[1].trim();
      // Eliminar comillas si existen
      jwtSecret = jwtSecret.replace(/^["']|["']$/g, '');
      console.log('Loaded JWT_SECRET from apps/api/.env');
    }
  }
} catch (e) {
  console.warn('Could not read apps/api/.env:', e.message);
}

// Si no se encontró en API, intentar desde web/.env.local
if (!jwtSecret) {
  try {
    const envLocalPath = path.join(ROOT_DIR, 'apps/web/.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envContent.match(/JWT_SECRET=(.+)/);
      if (match) {
        jwtSecret = match[1].trim();
        jwtSecret = jwtSecret.replace(/^["']|["']$/g, '');
      }
    }
  } catch (e) {
    console.warn('Could not read apps/web/.env.local:', e.message);
  }
}

module.exports = {
  apps: [
    {
      name: 'api',
      cwd: './apps/api',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Variables minimas - el resto se carga desde .env
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1', // Siempre 127.0.0.1, Nginx hace el proxy
      },
      // Configurar log rotation - rutas absolutas para que logs vayan al directorio correcto
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(LOGS_DIR.api, 'api-error.log'),
      out_file: path.join(LOGS_DIR.api, 'api-out.log'),
      merge_logs: true,
    },
    {
      name: 'web',
      cwd: './apps/web',
      // AI_DECISION: Usar next directamente en fork mode
      // Justificación:
      //   1. PM2 no captura stdout correctamente cuando ejecuta pnpm como wrapper
      //   2. Next.js no es compatible con cluster mode de PM2 (maneja concurrencia internamente)
      // Impacto: Los logs de Next.js van a web-out.log correctamente
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      exec_mode: 'fork', // Next.js no soporta cluster mode
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // JWT_SECRET se pasa explícitamente para que el middleware pueda validar tokens
        JWT_SECRET: jwtSecret || process.env.JWT_SECRET || '',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(LOGS_DIR.web, 'web-error.log'),
      out_file: path.join(LOGS_DIR.web, 'web-out.log'),
      merge_logs: true,
    },
    {
      name: 'analytics',
      cwd: './apps/analytics-service',
      script: './venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 3002 --workers 1 --log-level warning',
      interpreter: 'none', // Ejecutar uvicorn directamente desde el venv
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        ANALYTICS_PORT: 3002,
        PYTHONUNBUFFERED: '1',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(LOGS_DIR.analytics, 'analytics-error.log'),
      out_file: path.join(LOGS_DIR.analytics, 'analytics-out.log'),
      merge_logs: true,
    },
  ],
};
