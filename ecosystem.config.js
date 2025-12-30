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
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1', // Or 0.0.0.0 if you need external access, but usually behind Nginx
      },
      // Ensure we build before start if needed, but PM2 usually just runs
    },
    {
      name: 'web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'analytics',
      cwd: './apps/analytics-service',
      script: 'python3',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 3002 --workers 1 --log-level warning',
      interpreter: 'none', // We are calling python3 directly as the script
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        ANALYTICS_PORT: 3002,
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
};
