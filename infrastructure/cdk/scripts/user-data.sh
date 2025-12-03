#!/bin/bash
###############################################################################
# User Data Script para EC2 - Cactus MVP
# 
# Este script se ejecuta automáticamente cuando la instancia EC2 se inicia
# por primera vez. Configura:
# - Docker y Docker Compose
# - PM2 para gestión de procesos y logs
# - Exportación automática de logs a S3 (más económico que CloudWatch)
# - CloudWatch Agent para métricas básicas
# - Swap para optimizar memoria
# 
# @version 2.1.0
###############################################################################

set -e  # Exit on error
set -x  # Print commands

# Logging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user-data script at $(date)"

# Variables (serán reemplazadas por CDK o configuradas manualmente)
LOGS_BUCKET="${LOGS_BUCKET:-cactus-logs}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# ==================== System Update ====================

echo "📦 Updating system packages..."
yum update -y

# ==================== Install Docker ====================

echo "🐳 Installing Docker..."
yum install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# ==================== Install Docker Compose ====================

echo "📦 Installing Docker Compose..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

docker --version
docker-compose --version

# ==================== Install Node.js y PM2 ====================

echo "📦 Installing Node.js 22 and PM2..."
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Instalar PM2 globalmente
npm install -g pm2

# Configurar PM2 para iniciar con el sistema
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# ==================== Install Utilities ====================

echo "🛠️ Installing utilities..."
yum install -y git htop tmux vim curl wget jq awscli

# ==================== Configure Swap ====================

echo "💾 Configuring swap space..."
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p

# ==================== Create Application Directory ====================

echo "📁 Creating application directories..."
mkdir -p /home/ec2-user/cactus
mkdir -p /home/ec2-user/cactus/logs
mkdir -p /home/ec2-user/cactus/logs/api
mkdir -p /home/ec2-user/cactus/logs/web
mkdir -p /home/ec2-user/cactus/logs/analytics
mkdir -p /home/ec2-user/scripts
chown -R ec2-user:ec2-user /home/ec2-user/cactus
chown -R ec2-user:ec2-user /home/ec2-user/scripts

# ==================== PM2 Ecosystem File ====================

echo "📝 Creating PM2 ecosystem configuration..."
cat > /home/ec2-user/cactus/ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [
    {
      name: 'cactus-api',
      cwd: '/home/ec2-user/cactus/apps/api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Logs con rotación
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/cactus/logs/api/error.log',
      out_file: '/home/ec2-user/cactus/logs/api/out.log',
      combine_logs: true,
      max_size: '50M',
      retain: 7,
      // Restart policies
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100
    },
    {
      name: 'cactus-web',
      cwd: '/home/ec2-user/cactus/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/cactus/logs/web/error.log',
      out_file: '/home/ec2-user/cactus/logs/web/out.log',
      combine_logs: true,
      max_size: '50M',
      retain: 7,
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: 'cactus-analytics',
      cwd: '/home/ec2-user/cactus/apps/analytics-service',
      script: 'venv/bin/python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 3002',
      instances: 1,
      exec_mode: 'fork',
      env: {
        ENVIRONMENT: 'production',
        PORT: 3002
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/cactus/logs/analytics/error.log',
      out_file: '/home/ec2-user/cactus/logs/analytics/out.log',
      combine_logs: true,
      max_size: '50M',
      retain: 7,
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
};
EOFPM2

chown ec2-user:ec2-user /home/ec2-user/cactus/ecosystem.config.js

# ==================== Script de Exportación de Logs a S3 ====================

echo "📝 Creating log export script..."
cat > /home/ec2-user/scripts/export-logs-to-s3.sh << 'EOFEXPORT'
#!/bin/bash
###############################################################################
# Script para exportar logs de PM2 a S3
# Ejecutado por cron cada hora
###############################################################################

set -e

LOGS_DIR="/home/ec2-user/cactus/logs"
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
DATE=$(date +%Y/%m/%d)
HOUR=$(date +%H)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Obtener el nombre del bucket desde los tags de la instancia o usar variable de entorno
if [ -z "$LOGS_BUCKET" ]; then
    # Intentar obtener de los tags de EC2
    LOGS_BUCKET=$(aws ec2 describe-tags \
        --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=LogsBucket" \
        --query 'Tags[0].Value' --output text 2>/dev/null || echo "")
fi

if [ -z "$LOGS_BUCKET" ] || [ "$LOGS_BUCKET" == "None" ]; then
    echo "ERROR: LOGS_BUCKET not configured. Set it as environment variable or EC2 tag."
    exit 1
fi

echo "Exporting logs to s3://$LOGS_BUCKET/$DATE/$HOUR/"

# Rotar logs de PM2 antes de exportar
pm2 flush

# Exportar cada tipo de log
for SERVICE in api web analytics; do
    LOG_PATH="$LOGS_DIR/$SERVICE"
    
    if [ -d "$LOG_PATH" ]; then
        for LOG_FILE in "$LOG_PATH"/*.log; do
            if [ -f "$LOG_FILE" ] && [ -s "$LOG_FILE" ]; then
                FILENAME=$(basename "$LOG_FILE")
                S3_KEY="$DATE/$HOUR/${INSTANCE_ID}_${SERVICE}_${FILENAME%.log}_${TIMESTAMP}.log"
                
                echo "Uploading $LOG_FILE to s3://$LOGS_BUCKET/$S3_KEY"
                
                # Comprimir y subir
                gzip -c "$LOG_FILE" | aws s3 cp - "s3://$LOGS_BUCKET/${S3_KEY}.gz" \
                    --content-encoding gzip \
                    --storage-class STANDARD_IA
                
                # Limpiar el archivo de log local después de subir exitosamente
                if [ $? -eq 0 ]; then
                    > "$LOG_FILE"
                    echo "Successfully exported and cleared $LOG_FILE"
                fi
            fi
        done
    fi
done

# Exportar logs del sistema
SYSTEM_LOG="/var/log/user-data.log"
if [ -f "$SYSTEM_LOG" ]; then
    aws s3 cp "$SYSTEM_LOG" "s3://$LOGS_BUCKET/$DATE/$HOUR/${INSTANCE_ID}_system_${TIMESTAMP}.log" \
        --storage-class STANDARD_IA
fi

echo "Log export completed at $(date)"
EOFEXPORT

chmod +x /home/ec2-user/scripts/export-logs-to-s3.sh
chown ec2-user:ec2-user /home/ec2-user/scripts/export-logs-to-s3.sh

# ==================== Script de Monitoreo de Logs ====================

echo "📝 Creating log monitoring script..."
cat > /home/ec2-user/scripts/check-logs.sh << 'EOFCHECK'
#!/bin/bash
###############################################################################
# Script para verificar el estado de los logs y PM2
###############################################################################

echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Log Files Size ==="
du -sh /home/ec2-user/cactus/logs/*/ 2>/dev/null || echo "No logs yet"

echo ""
echo "=== Recent Errors (last 20 lines) ==="
for SERVICE in api web analytics; do
    ERROR_LOG="/home/ec2-user/cactus/logs/$SERVICE/error.log"
    if [ -f "$ERROR_LOG" ] && [ -s "$ERROR_LOG" ]; then
        echo "--- $SERVICE errors ---"
        tail -20 "$ERROR_LOG"
    fi
done

echo ""
echo "=== Disk Usage ==="
df -h /

echo ""
echo "=== Memory Usage ==="
free -h
EOFCHECK

chmod +x /home/ec2-user/scripts/check-logs.sh
chown ec2-user:ec2-user /home/ec2-user/scripts/check-logs.sh

# ==================== Configurar Cron para Exportación ====================

echo "⏰ Setting up cron job for log export..."
cat > /etc/cron.d/cactus-logs << 'EOFCRON'
# Exportar logs a S3 cada hora
0 * * * * ec2-user /home/ec2-user/scripts/export-logs-to-s3.sh >> /var/log/log-export.log 2>&1

# Limpiar logs antiguos locales cada día a las 3 AM
0 3 * * * ec2-user find /home/ec2-user/cactus/logs -name "*.log" -mtime +1 -delete

# Reiniciar PM2 para evitar memory leaks cada domingo a las 4 AM
0 4 * * 0 ec2-user pm2 reload all
EOFCRON

chmod 644 /etc/cron.d/cactus-logs

# ==================== CloudWatch Agent (solo métricas, no logs) ====================

echo "📊 Installing CloudWatch Agent for metrics only..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm
rm ./amazon-cloudwatch-agent.rpm

# Configurar CloudWatch Agent SOLO para métricas (logs van a S3)
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOFCW'
{
  "metrics": {
    "namespace": "Cactus/MVP",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60,
        "totalcpu": true
      },
      "disk": {
        "measurement": ["used_percent", "free"],
        "metrics_collection_interval": 60,
        "resources": ["/"]
      },
      "mem": {
        "measurement": ["mem_used_percent", "mem_available"],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": ["tcp_established", "tcp_time_wait"],
        "metrics_collection_interval": 60
      },
      "processes": {
        "measurement": ["running", "sleeping", "dead"],
        "metrics_collection_interval": 60
      }
    },
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}"
    }
  }
}
EOFCW

# Iniciar CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# ==================== Configure Log Rotation Local ====================

echo "📜 Configuring local log rotation..."
cat > /etc/logrotate.d/cactus << 'EOFLOGROTATE'
/home/ec2-user/cactus/logs/*/*.log {
    daily
    rotate 2
    compress
    delaycompress
    notifempty
    create 0644 ec2-user ec2-user
    sharedscripts
    postrotate
        pm2 reloadLogs > /dev/null 2>&1 || true
    endscript
}
EOFLOGROTATE

# ==================== Security Updates ====================

echo "🔒 Enabling automatic security updates..."
yum install -y yum-cron
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/yum/yum-cron.conf
systemctl start yum-cron
systemctl enable yum-cron

# ==================== Final Steps ====================

echo ""
echo "✅ User-data script completed successfully at $(date)"
echo ""
echo "🚀 Instance ready for Cactus deployment!"
echo ""
echo "📋 Next steps:"
echo "   1. Clone your repository:"
echo "      git clone <repo-url> /home/ec2-user/cactus"
echo ""
echo "   2. Configure environment variables:"
echo "      export LOGS_BUCKET=<your-logs-bucket-name>"
echo ""
echo "   3. Install dependencies and build:"
echo "      cd /home/ec2-user/cactus && pnpm install && pnpm build"
echo ""
echo "   4. Start with PM2:"
echo "      pm2 start /home/ec2-user/cactus/ecosystem.config.js"
echo "      pm2 save"
echo ""
echo "📊 Monitoring:"
echo "   - Check logs: /home/ec2-user/scripts/check-logs.sh"
echo "   - Export logs manually: /home/ec2-user/scripts/export-logs-to-s3.sh"
echo "   - PM2 status: pm2 status"
echo "   - PM2 logs: pm2 logs"
