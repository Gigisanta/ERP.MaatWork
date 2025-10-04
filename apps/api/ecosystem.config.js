module.exports = {
  apps: [
    {
      name: 'cactus-api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      max_memory_restart: '512M'
    }
  ]
};


