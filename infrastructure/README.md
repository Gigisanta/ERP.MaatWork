# Cactus Infrastructure

Infraestructura como código (IaC) para Cactus CRM usando AWS CDK.

## Arquitectura

El sistema soporta **dos modos de deployment**:

### MVP Mode (~$20-35/mes)

Arquitectura simple y económica para validación inicial del producto.

```
Internet
   ↓
Elastic IP
   ↓
┌─────────────────────────────────────┐
│   EC2 t3.small                      │
│   ┌───────────────────────────────┐ │
│   │   Docker Compose              │ │
│   │   ├── nginx (80, 443)         │ │
│   │   ├── api (3001)              │ │
│   │   ├── web (3000)              │ │
│   │   └── analytics (3002)        │ │
│   └───────────────────────────────┘ │
└─────────────────────────────────────┘
   ↓
RDS PostgreSQL t3.micro (Free Tier)
```

**Recursos:**
- VPC por defecto (sin costo adicional)
- EC2 t3.small: 2 vCPU, 2GB RAM, 30GB GP3
- RDS PostgreSQL 16 t3.micro: 20GB (Free Tier: 750hrs/mes primer año)
- Elastic IP (gratis mientras esté asociada)
- **S3 Bucket para logs** (más económico que CloudWatch Logs)
- **PM2** para gestión de procesos y logs
- CloudWatch Alarms básicos (solo métricas, no logs)
- Budget Alert (80% y 100% del presupuesto)

### Advanced Mode (~$70-150/mes)

Arquitectura escalable para producción con alta disponibilidad.

```
Internet
   ↓
Application Load Balancer
   ↓
┌─────────────────────────────────────┐
│   ECS Fargate Cluster               │
│   ├── API Service (1-10 tasks)      │
│   ├── Web Service (1-10 tasks)      │
│   └── Analytics Service (1 task)    │
└─────────────────────────────────────┘
   ↓
VPC Custom
├── Public Subnets (ALB)
├── Private Subnets (ECS + NAT)
└── Isolated Subnets (RDS)
   ↓
RDS PostgreSQL (Multi-AZ en prod)
```

**Recursos adicionales:**
- VPC custom con 3 tipos de subnets
- NAT Gateway (1 en dev, 2 en prod para HA)
- Application Load Balancer
- ECS Cluster + Fargate Services
- ECR Repositories
- Auto-scaling (solo en prod)
- **CloudWatch Logs** para cada servicio
- CloudWatch Dashboard completo
- Budget Alert (80% y 100% del presupuesto)

## Sistema de Logs

### MVP: PM2 + S3 (Económico)

En modo MVP, los logs se gestionan de forma económica:

1. **PM2** gestiona los procesos y escribe logs localmente
2. **Cron job** exporta logs comprimidos a S3 cada hora
3. **S3 Lifecycle** mueve logs a Glacier después de 30 días y los elimina después de 90

**Costo aproximado:** ~$0.023/GB (vs ~$0.50/GB de CloudWatch Logs)

```bash
# Ver estado de logs en MVP
/home/ec2-user/scripts/check-logs.sh

# Exportar logs manualmente
/home/ec2-user/scripts/export-logs-to-s3.sh

# Ver logs en tiempo real
pm2 logs

# Ver logs de un servicio específico
pm2 logs cactus-api
```

### Advanced: CloudWatch Logs

En modo Advanced, los logs van directamente a CloudWatch Logs:

- Retención: 2 semanas
- Cada servicio tiene su propio log group: `/ecs/{prefix}/api`, `/ecs/{prefix}/web`, etc.
- Integración con CloudWatch Insights para búsquedas

## Alertas de Presupuesto

Ambos modos incluyen alertas de presupuesto configuradas automáticamente:

| Umbral | Notificación |
|--------|--------------|
| 80% | Alerta preventiva |
| 100% | Alerta de límite alcanzado |

Las alertas se envían a un topic SNS. Para recibir emails:

1. Configura `alarmEmail` en la configuración:

```typescript
// En lib/config/index.ts
monitoring: {
    alarmEmail: 'tu-email@ejemplo.com',
    budgetAmount: 35,
    // ...
}
```

2. O suscríbete manualmente al topic SNS desde la consola AWS

## Estructura de Archivos

```
infrastructure/
├── cdk/
│   ├── bin/
│   │   └── cactus.ts              # Entry point CDK
│   ├── lib/
│   │   ├── config/
│   │   │   ├── index.ts           # Configuración central + validación
│   │   │   └── types.ts           # Tipos TypeScript
│   │   ├── stacks/
│   │   │   ├── cactus-stack.ts    # Stack principal
│   │   │   └── monitoring-stack.ts # Monitoring
│   │   └── constructs/
│   │       ├── mvp-compute.ts     # EC2 + Docker Compose
│   │       └── advanced-compute.ts # ECS Fargate + ALB
│   ├── scripts/
│   │   └── user-data.sh           # Script inicialización EC2
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   ├── deploy.ps1                 # Script deployment Windows
│   └── deploy.sh                  # Script deployment Unix
└── README.md
```

## Configuraciones Disponibles

| Config | Mode | Env | VPC | Compute | DB | NAT | Costo Est. |
|--------|------|-----|-----|---------|----|----|------------|
| MVP-DEV | mvp | dev | default | EC2 t3.small | t3.micro | 0 | ~$20/mes |
| MVP-PROD | mvp | prod | default | EC2 t3.small | t3.micro | 0 | ~$35/mes |
| ADV-DEV | advanced | dev | custom | ECS Fargate | t3.micro | 1 | ~$70/mes |
| ADV-PROD | advanced | prod | custom | ECS Fargate | t3.small Multi-AZ | 2 | ~$150/mes |

## Requisitos

- Node.js >= 22
- pnpm >= 9
- AWS CLI configurado
- Cuenta AWS con permisos adecuados

## Setup Inicial

### 1. Instalar dependencias

```bash
cd infrastructure/cdk
pnpm install
```

### 2. Configurar AWS CLI

```bash
aws configure
# O usar perfiles:
aws configure --profile cactus-dev
aws configure --profile cactus-prod
```

### 3. Bootstrap CDK (solo primera vez)

```bash
# Para cuenta de desarrollo
export AWS_PROFILE=cactus-dev
npx cdk bootstrap

# Para cuenta de producción
export AWS_PROFILE=cactus-prod
npx cdk bootstrap
```

## Deployment

### Usando Scripts (Recomendado)

#### Windows (PowerShell)

```powershell
# MVP en desarrollo
.\infrastructure\scripts\deploy.ps1 -Environment dev -Mode mvp

# MVP en producción
.\infrastructure\scripts\deploy.ps1 -Environment prod -Mode mvp

# Advanced en desarrollo
.\infrastructure\scripts\deploy.ps1 -Environment dev -Mode advanced

# Advanced en producción
.\infrastructure\scripts\deploy.ps1 -Environment prod -Mode advanced

# Ver diferencias antes de desplegar
.\infrastructure\scripts\deploy.ps1 -Environment dev -Mode mvp -Action diff

# Destruir infraestructura
.\infrastructure\scripts\deploy.ps1 -Environment dev -Mode mvp -Action destroy
```

#### Unix/Linux/Mac

```bash
# Dar permisos de ejecución
chmod +x infrastructure/scripts/deploy.sh

# MVP en desarrollo
./infrastructure/scripts/deploy.sh --env dev --mode mvp

# MVP en producción
./infrastructure/scripts/deploy.sh --env prod --mode mvp

# Advanced en desarrollo
./infrastructure/scripts/deploy.sh --env dev --mode advanced

# Advanced en producción
./infrastructure/scripts/deploy.sh --env prod --mode advanced

# Ver diferencias
./infrastructure/scripts/deploy.sh -e dev -m mvp -a diff

# Destruir
./infrastructure/scripts/deploy.sh -e dev -m mvp -a destroy
```

### Usando pnpm directamente

```bash
cd infrastructure/cdk

# MVP
pnpm deploy:mvp:dev
pnpm deploy:mvp:prod

# Advanced
pnpm deploy:adv:dev
pnpm deploy:adv:prod

# Diff
pnpm diff:mvp:dev
pnpm diff:adv:prod

# Destroy
pnpm destroy:mvp:dev
pnpm destroy:adv:dev
```

### Usando CDK directamente

```bash
cd infrastructure/cdk

# MVP en desarrollo
npx cdk deploy --all --context mode=mvp --context env=dev

# Advanced en producción
npx cdk deploy --all --context mode=advanced --context env=prod
```

## Outputs

Después del deployment, CDK mostrará:

**MVP:**
- `InstanceIP`: IP elástica de la instancia EC2
- `SSHCommand`: Comando SSH para conectar
- `LogsBucketName`: Nombre del bucket S3 para logs
- `ApiUrl`: URL de la API
- `WebUrl`: URL de la aplicación web
- `DBEndpoint`: Endpoint de RDS

**Advanced:**
- `LoadBalancerDNS`: DNS del Application Load Balancer
- `ClusterName`: Nombre del cluster ECS
- `ApiRepoUri`: URI del repositorio ECR para API
- `WebRepoUri`: URI del repositorio ECR para Web
- `AnalyticsRepoUri`: URI del repositorio ECR para Analytics

## Migración MVP → Advanced

1. Exportar datos de la base de datos actual:
   ```bash
   pg_dump -h <mvp-db-endpoint> -U cactus_admin cactus > backup.sql
   ```

2. Cambiar a modo advanced:
   ```bash
   ./deploy.sh --env prod --mode advanced --action diff
   ```

3. Revisar cambios y desplegar:
   ```bash
   ./deploy.sh --env prod --mode advanced
   ```

4. Importar datos a la nueva base de datos:
   ```bash
   psql -h <new-db-endpoint> -U cactus_admin cactus < backup.sql
   ```

5. Actualizar DNS o redirecciones

6. Destruir infraestructura MVP (opcional):
   ```bash
   ./deploy.sh --env prod --mode mvp --action destroy
   ```

## Costos Detallados

### MVP (Primer año con Free Tier)

| Recurso | Costo/mes |
|---------|-----------|
| EC2 t3.small | $15.00 |
| RDS t3.micro (Free Tier) | $0.00 |
| EBS GP3 30GB | $2.40 |
| Elastic IP | $0.00 |
| S3 Logs (~5GB) | $0.12 |
| CloudWatch Metrics | $0.00 |
| **Total** | **~$18/mes** |

### MVP (Después del Free Tier)

| Recurso | Costo/mes |
|---------|-----------|
| EC2 t3.small | $15.00 |
| RDS t3.micro | $14.60 |
| EBS GP3 30GB | $2.40 |
| S3 Logs (~10GB) | $0.23 |
| CloudWatch Metrics | ~$1.00 |
| **Total** | **~$33/mes** |

### Advanced Dev

| Recurso | Costo/mes |
|---------|-----------|
| NAT Gateway | $32.00 |
| ALB | $16.00 |
| ECS Fargate (3 tasks) | $15.00 |
| RDS t3.micro | $14.60 |
| CloudWatch Logs (~5GB) | $2.50 |
| **Total** | **~$80/mes** |

### Advanced Prod

| Recurso | Costo/mes |
|---------|-----------|
| NAT Gateway x2 | $64.00 |
| ALB | $16.00 |
| ECS Fargate (6 tasks) | $30.00 |
| RDS t3.small Multi-AZ | $50.00 |
| CloudWatch Logs (~20GB) | $10.00 |
| **Total** | **~$170/mes** |

### Comparación de Costos de Logs

| Método | Costo por GB | 10GB/mes |
|--------|-------------|----------|
| S3 Standard | $0.023 | $0.23 |
| S3 + Glacier (30 días) | ~$0.01 | ~$0.10 |
| CloudWatch Logs | $0.50 | $5.00 |

**Ahorro MVP vs CloudWatch:** ~95% en costos de logs

## Monitoreo

### Alarmas Configuradas

- **CPU**: Alerta cuando supera umbral (configurable)
- **Memoria**: Alerta cuando supera umbral
- **Disco** (MVP): Alerta cuando supera 80%
- **5xx Errors** (Advanced): Alerta con >10 errores en 5 min
- **Unhealthy Targets** (Advanced): Alerta si hay targets no saludables
- **Budget**: Alerta al 80% y 100% del presupuesto

### Dashboard

Accede al dashboard de CloudWatch desde la URL en los outputs o desde la consola AWS.

## Troubleshooting

### Error: "VPC not found"

El modo MVP usa la VPC por defecto. Si no existe:
```bash
aws ec2 create-default-vpc
```

### Error: "Insufficient permissions"

Verifica que el usuario IAM tenga permisos para:
- CloudFormation
- EC2, VPC, ECS, ECR
- RDS, Secrets Manager
- CloudWatch, SNS
- Budgets, IAM

### Error: "Stack already exists"

Usa `deploy` en lugar de `create`:
```bash
pnpm deploy:mvp:dev
```

### Rollback

Para hacer rollback en ECS:
```bash
aws ecs update-service \
  --cluster cactus-prod \
  --service cactus-prod-api \
  --task-definition cactus-api-prod:PREVIOUS_VERSION \
  --force-new-deployment
```

## Seguridad

### Recomendaciones para Producción

- [ ] Limitar acceso SSH por IP
- [ ] Habilitar SSL/TLS con ACM
- [ ] Configurar WAF en ALB
- [ ] Rotar credenciales periódicamente
- [ ] Habilitar VPC Flow Logs
- [ ] Configurar GuardDuty

## Soporte

Para problemas o preguntas, abre un issue en el repositorio.

