/**
 * PM2 Ecosystem Configuration
 *
 * AI_DECISION: Variables sensibles cargadas desde process.env
 * Justificación: deploy.sh exporta JWT_SECRET y API_URL_INTERNAL antes de iniciar PM2
 *                Esto permite mantener secretos fuera del código versionado
 * Impacto: Autenticación funciona correctamente detrás de Cloudflare
 *
 * Variables requeridas (exportadas por deploy.sh):
 * - JWT_SECRET: Secreto para validar tokens JWT (cargado de apps/api/.env)
 * - API_URL_INTERNAL: URL interna del API para Server Components (http://127.0.0.1:3001)
 */
module.exports = {
  apps: [
    {
      name: 'cactus-api',
      cwd: '/home/ec2-user/abax/apps/api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1', // Security: only listen on localhost, nginx handles external traffic
      },
      error_file: '/home/ec2-user/logs/api-error.log',
      out_file: '/home/ec2-user/logs/api-out.log',
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'cactus-web',
      cwd: '/home/ec2-user/abax/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1', // Security: only listen on localhost
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Estas variables son cargadas por deploy.sh desde apps/api/.env
        // y pasadas a PM2 vía --update-env
        JWT_SECRET: process.env.JWT_SECRET,
        API_URL_INTERNAL: process.env.API_URL_INTERNAL || 'http://127.0.0.1:3001',
      },
      error_file: '/home/ec2-user/logs/web-error.log',
      out_file: '/home/ec2-user/logs/web-out.log',
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'cactus-analytics',
      cwd: '/home/ec2-user/abax/apps/analytics-service',
      script: 'venv/bin/uvicorn',
      args: 'main:app --host 127.0.0.1 --port 3002', // Security: only listen on localhost
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'none',
      env: {
        ENVIRONMENT: 'production',
      },
      error_file: '/home/ec2-user/logs/analytics-error.log',
      out_file: '/home/ec2-user/logs/analytics-out.log',
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
