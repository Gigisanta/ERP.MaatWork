# Guía Rápida de Deployment MVP

Esta guía te permitirá deployar Cactus a producción en menos de 2 horas con un costo de **$15-35/mes**.

## 📋 Prerequisitos

- [ ] Cuenta AWS (una sola)
- [ ] AWS CLI instalado
- [ ] Node.js >= 22, pnpm >= 9
- [ ] Par de claves SSH para EC2
- [ ]Acceso a GitHub repo

## 🚀 Deployment en 5 Pasos

### Paso 1: Crear Par de Claves SSH (5 min)

```bash
# En AWS Console
# EC2 > Key Pairs > Create key pair
# Nombre: maatwork-mvp-key
# Formato: .pem
# Guardar en ~/.ssh/maatwork-mvp-key.pem

chmod 400 ~/.ssh/maatwork-mvp-key.pem
```

### Paso 2: Deploy Infraestructura con CDK (15 min)

```bash
# Configurar AWS CLI
aws configure
# Ingresa Access Key, Secret Key, región (us-east-1)

# Instalar dependencias CDK
cd infrastructure/mvp/cdk
pnpm install

# Bootstrap CDK (solo primera vez)
pnpm cdk bootstrap

# Deploy
pnpm deploy

# Guarda los outputs:
# - InstanceIP: X.X.X.X
# - DBSecretArn: arn:aws:secretsmanager:...
```

### Paso 3: Configurar EC2 (10 min)

```bash
# Obtener IP de la instancia
EC2_IP=$(aws cloudformation describe-stacks \
  --stack-name CactusMVP \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceIP`].OutputValue' \
  --output text)

echo "EC2 IP: $EC2_IP"

# Esperar 2-3 minutos para que termine user-data script

# SSH a la instancia
ssh -i ~/.ssh/maatwork-mvp-key.pem ec2-user@$EC2_IP

# En la instancia EC2:
# Verificar que Docker esté instalado
docker --version
docker-compose --version

# Clonar repo
cd ~
git clone https://github.com/YOUR_USER/MAATWORK.git maatwork
cd maatwork

# Configurar Git credentials para futuros pulls
git config --global credential.helper store
```

### Paso 4: Configurar Variables de Entorno (5 min)

```bash
# En la instancia EC2

# Obtener DATABASE_URL desde Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id maatwork/mvp/db-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r

# Crear .env
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/maatwork
JWT_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_API_URL=http://$EC2_IP/api
CORS_ORIGINS=*
LOG_LEVEL=info
EOF

# Verificar .env
cat .env
```

### Paso 5: Deploy Aplicación (30 min)

```bash
# En la instancia EC2

# Copiar docker-compose y nginx config
cp infrastructure/mvp/docker/docker-compose.yml .
cp infrastructure/mvp/docker/nginx.conf .

# Build imágenes (toma ~25 minutos)
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver estado
docker-compose ps
#Debería mostrar:
# - nginx (healthy)
# - api (healthy)
# - web (healthy)
# - analytics (healthy)
```

### Verificación

```bash
# Desde tu máquina local

# Health check
curl http://$EC2_IP/health
# Debe responder: {"status":"ok"}

# Web app
open http://$EC2_IP
# Debe cargar la aplicación

# API
curl http://$EC2_IP/api/health
```

## 🎯 Configurar GitHub Actions

### 1. Crear Secrets en GitHub

Ve a: `Settings > Secrets and variables > Actions > New repository secret`

Agrega:

| Secret Name | Value | Descripción |
|------------|-------|-------------|
| `EC2_IP` | X.X.X.X | IP del output de CDK |
| `EC2_SSH_KEY` | Contenido de .pem | Private key completa |
| `DATABASE_URL` | postgresql://... | Connection string |
| `AWS_ACCESS_KEY_ID` | AKIA... | Para tareas futuras |
| `AWS_SECRET_ACCESS_KEY` | ... | Para tareas futuras |

### 2. Crear Environment "mvp"

1. Settings > Environments > New environment
2. Nombre: `mvp`
3. (Opcional) Environment protection rules > Required reviewers

### 3. Trigger Deployment

1. Actions > Deploy to MVP (EC2)
2. Run workflow
3. Selecciona service: `all`
4. Run workflow
5. Espera ~5-10 minutos

## 🔧 Uso Diario

### Deploy de Cambios

```bash
# Opción 1: Desde GitHub Actions
# - Push a main
# - Actions > Deploy to MVP
# - Run workflow

# Opción 2: Manual desde EC2
ssh -i ~/.ssh/maatwork-mvp-key.pem ec2-user@$EC2_IP
cd ~/maatwork
git pull
docker-compose build
docker-compose up -d
```

### Ver Logs

```bash
# SSH a EC2
ssh -i ~/.ssh/maatwork-mvp-key.pem ec2-user@$EC2_IP

# Logs de todos los servicios
cd ~/maatwork
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f api
docker-compose logs -f web
```

### Restart Servicios

```bash
# Restart todo
docker-compose restart

# Restart servicio específico
docker-compose restart api
```

### Limpiar Espacio en Disco

```bash
# Limpiar Docker images/containers viejos
docker system prune -a --volumes

# Ver uso de disco
df -h
```

## 📊 Monitoreo

### CloudWatch Logs

```bash
# Ver logs desde AWS CLI
aws logs tail /ec2/maatwork/application --follow
```

### Métricas en AWS Console

1. CloudWatch > Dashboards
2. Ver CPU, memoria, disco
3. Alarmas configuradas te enviarán emails

### Verificar Costos

1. AWS Console > Billing > Bills
2. Filtrar por tag: `Project=Cactus`

## ⚠️ Troubleshooting

### Servicios no inician

```bash
# Ver logs
docker-compose logs api

# Reiniciar
docker-compose down
docker-compose up -d
```

### Out of Memory

```bash
# Verificar memoria
free -h

# El user-data ya configuró 2GB de swap
# Si necesitas más, considera t3.medium
```

### No puedo conectar por SSH

```bash
# Verificar Security Group
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=CactusMVP*" \
  --query 'SecurityGroups[*].IpPermissions'

# Debe permitir puerto 22 desde tu IP
```

## 🔐 Seguridad Post-Deployment

### Cambiar SSH Port (Recomendado)

```bash
# En EC2
sudo vim /etc/ssh/sshd_config
# Cambiar Port 22 a Port 2222
sudo systemctl restart sshd

# Actualizar Security Group para puerto 2222
```

### Habilitar HTTPS (Cuando tengas dominio)

```bash
# Instalar Certbot
sudo yum install -y certbot

# Obtener certificado
sudo certbot certonly --standalone -d your-domain.com

# Configurar Nginx SSL
# Ver: infrastructure/mvp/docs/ssl-setup.md
```

## 📈 Próximos Pasos

- [ ] Configurar dominio custom (Route 53)
- [ ] Habilitar HTTPS con Let's Encrypt
- [ ] Configurar backups automáticos de EC2
- [ ] Setup alertas SNS con tu email
- [ ] Monitorear costos semanalmente

## 🚀 Migración a Fase 2 (Cuando crezcas)

Cuando tengas 500+ usuarios activos:

1. Ver documentación en `infrastructure/cdk/README.md`
2. Deploy infraestructura Fase 2 con ECS Fargate
3. Migrar datos de RDS a nuevo RDS
4. Cambiar DNS a nuevo ALB
5. Destruir infraestructura MVP

---

## 💰 Costos Esperados

**Primer año**: ~$20/mes  
**Después del año 1**: ~$35/mes

**Componentes**:
- EC2 t3.small: $15/mes
- RDS t3.micro: FREE primer año, luego $15/mes
- EBS + Snapshots: $5/mes
- Data Transfer: $0-5/mes

---

¿Necesitas ayuda? Abre un issue en el repo.
