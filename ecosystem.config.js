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
 * WEB (.env en apps/web/ ANTES del build):
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
      // Configurar log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },
    {
      name: 'web',
      cwd: './apps/web',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
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
      error_file: './logs/analytics-error.log',
      out_file: './logs/analytics-out.log',
      merge_logs: true,
    },
  ],
};
