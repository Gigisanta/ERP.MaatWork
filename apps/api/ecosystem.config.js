module.exports = {
  apps: [
    {
      name: 'cactus-api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
  deploy: {
    production: {
      post_deploy:
        'pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 10M && pm2 set pm2-logrotate:retain 10 && pm2 set pm2-logrotate:compress true && pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss && pm2 set pm2-logrotate:workerInterval 60 && pm2 set pm2-logrotate:rotateInterval 0 0 * * *',
    },
  },
};
