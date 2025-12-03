module.exports = {
  apps: [
    {
      name: "cactus-api",
      cwd: "/home/ec2-user/abax/apps/api",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOST: "127.0.0.1"  // Security: only listen on localhost, nginx handles external traffic
      },
      error_file: "/home/ec2-user/logs/api-error.log",
      out_file: "/home/ec2-user/logs/api-out.log",
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: "cactus-web",
      cwd: "/home/ec2-user/abax/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",  // Security: only listen on localhost
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "/home/ec2-user/logs/web-error.log",
      out_file: "/home/ec2-user/logs/web-out.log",
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: "cactus-analytics",
      cwd: "/home/ec2-user/abax/apps/analytics-service",
      script: "venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 3002",  // Security: only listen on localhost
      instances: 1,
      exec_mode: "fork",
      interpreter: "none",
      env: {
        ENVIRONMENT: "production"
      },
      error_file: "/home/ec2-user/logs/analytics-error.log",
      out_file: "/home/ec2-user/logs/analytics-out.log",
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
};

