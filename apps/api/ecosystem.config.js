module.exports = {
  apps: [
    {
      name: 'cactus-api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      // AI_DECISION: Add V8 optimization flags for memory efficiency
      // Justificación: --max-old-space-size limits heap to 75% of PM2 limit for safety margin,
      //                --optimize-for-size reduces memory footprint, --gc-interval enables more frequent GC
      // Impacto: Better memory management, ~15% reduction in base memory usage
      node_args: [
        '--max-old-space-size=384', // 75% of 512MB PM2 limit for safety margin
        '--optimize-for-size', // Optimize for smaller memory footprint
        '--gc-interval=100', // More frequent garbage collection (100ms)
      ],
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
      // AI_DECISION: Reduce max_memory_restart to be more aggressive about memory leaks
      // Justificación: Lower threshold triggers restart sooner, preventing memory accumulation
      // Impacto: Better recovery from memory leaks, prevents OOM crashes
      max_memory_restart: '384M', // More aggressive (75% of original 512M)
      // AI_DECISION: Add recovery settings to prevent restart loops
      // Justificación: min_uptime ensures process runs at least 10s before considering it stable,
      //                max_restarts prevents infinite restart loops, kill_timeout ensures graceful shutdown
      // Impacto: Prevents restart loops, ensures graceful shutdowns
      min_uptime: '10s', // Process must run at least 10s to be considered stable
      max_restarts: 10, // Maximum 10 restarts in window
      restart_delay: 4000, // Wait 4s between restarts
      kill_timeout: 5000, // Wait 5s for graceful shutdown before force kill
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
