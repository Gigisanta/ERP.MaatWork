module.exports = {
  apps: [
    {
      name: "cactus-api",
      cwd: "/home/ec2-user/abax/apps/api",
      script: "dist/apps/api/src/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001
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
      args: "start -p 3000",
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
      args: "main:app --host 0.0.0.0 --port 3002",
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

