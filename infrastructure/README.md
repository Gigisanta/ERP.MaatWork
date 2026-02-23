# MaatWork Infrastructure

Infraestructura como código (IaC) para MaatWork usando **Terraform** con soporte para AWS y Cloudflare.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                       Cloudflare                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │   DNS   │  │   SSL   │  │   WAF   │                     │
│  └────┬────┘  └────┬────┘  └────┬────┘                     │
└───────┼────────────┼────────────┼───────────────────────────┘
        │            │            │
        └────────────┴────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                         AWS                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Default VPC                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  EC2 (PM2)  │  │     RDS     │  │   S3 Logs   │  │   │
│  │  │  + Elastic  │  │  PostgreSQL │  │   Bucket    │  │   │
│  │  │     IP      │  │             │  │             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Costo estimado: ~$17-35/mes** (con Free Tier de RDS)

## Estructura

```
infrastructure/
├── aws-deprecated/          # ⚠️ AWS Infrastructure (archivado)
│   ├── terraform/           # Configuración Terraform AWS (EC2, RDS, S3, Cloudflare)
│   ├── deploy.sh            # Script deployment Unix (AWS)
│   ├── deploy.ps1           # Script deployment Windows (AWS)
│   ├── nginx.conf           # Configuración Nginx (AWS)
│   └── README.md            # Documentación AWS deprecated
├── scripts/                 # Scripts utilitarios (invariable)
│   └── ...                 # Scripts de desarrollo, testing, etc.
└── README.md                 # Este archivo
```

## Servicios Railway

| Servicio | Tipo | Descripción | Costo Est. |
|---------|------|-------------|------------|
| API Service | Node.js 22 | Express API (puerto dinámico) | ~$5/mes |
| Web Service | Next.js 16 | Frontend (puerto dinámico) | ~$5/mes |
| PostgreSQL | Managed | PostgreSQL 16 (0.5GB) | ~$5/mes |

**Total estimado: ~$15/mes**

## Recursos Cloudflare (Opcional)

| Recurso | Descripción |
|---------|-------------|
| DNS Records | A record, CNAME para www |
| SSL/TLS | Full (Strict) mode, HTTPS forzado |
| WAF | Rate limiting, protección DDoS |
| Page Rules | Cache para assets estáticos |

**Costo: $0** (plan gratuito es suficiente)

## Quick Start

### Prerequisitos

1. **Terraform** >= 1.6.0
2. **AWS CLI** configurado con credenciales
3. **Cloudflare API Token** (opcional)

### 1. Configurar Backend de Estado

```bash
# Crear bucket S3 para el estado
aws s3 mb s3://maatwork-terraform-state --region us-east-1

# Crear tabla DynamoDB para bloqueo
aws dynamodb create-table \
  --table-name maatwork-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Configurar Environment

```bash
cd infrastructure/terraform/environments/dev

# Copiar y editar configuración
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con tus valores
```

### 3. Desplegar

```bash
terraform init
terraform plan
terraform apply
```

## Documentación Adicional

- [Railway Deployment Guide](./docs/DEPLOYMENT-RAILWAY.md) - Documentación completa de Railway
- [AWS Deprecated](./aws-deprecated/README.md) - Arquitectura AWS histórica
- [Development Guide](../docs/DEVELOPMENT.md) - Guía de desarrollo local
- [Database Guide](../docs/DATABASE.md) - Schema y migraciones

## Sistema de Logs

Railway maneja logs automáticamente:
- **Streaming**: Logs en tiempo real desde dashboard
- **Storage**: Logs almacenados temporalmente para debugging
- **Costo**: Incluido en costo del servicio (no adicional)

```bash
# Ver logs en dashboard Railway
# 1. Ir a servicio → "Logs" tab
# 2. Filtrar por fecha/level
```

## Mantenimiento

### Ver estado de servicios Railway

```bash
# Desde dashboard Railway:
# 1. Ir a "Services"
# 2. Ver status (running, crashed, building)
# 3. Ver métricas (CPU, RAM, Network)
```

### Actualizar servicios

```bash
# Railway hace deploy automático en git push
# Para deploy manual:
# 1. Ir a servicio → "Deployments" tab
# 2. Click "New Deployment" → "Redeploy"
```

### Escalar servicios (si es necesario)

```bash
# Desde dashboard Railway:
# 1. Ir a servicio → "Settings"
# 2. Cambiar plan (Free → Pro)
# 3. Opciones:
#    - API: Más RAM/CPU para alta carga
#    - Web: Más RAM para build rápidos
#    - DB: Más storage/conexiones
```

## Troubleshooting

### Error: Build falla en monorepo

**Causa**: Root Directory configurado incorrectamente en `apps/` en lugar de `/`

**Solución**:
1. Ir a servicio Railway → "Settings"
2. Cambiar "Root Directory" a `/` (repo root)
3. Redeploy

### Error: Migraciones fallan

**Causa**: `preDeployCommand` falla antes del deployment

**Solución**:
1. Revisar logs de deployment en Railway dashboard
2. Verificar migraciones en `packages/db/migrations/`
3. Ejecutar migración manualmente: `pnpm --filter @maatwork/db migrate`

### Error: Cannot connect to database

**Causa**: `DATABASE_URL` no referenciada correctamente

**Solución**:
1. Verificar servicio PostgreSQL está corriendo
2. En servicio API → "Variables"
3. Click "Ref" button al lado de `DATABASE_URL`
4. Seleccionar servicio PostgreSQL

### Error: CORS errors en frontend

**Causa**: `CORS_ORIGINS` no incluye dominio Railway

**Solución**:
1. En servicio API → "Variables"
2. Actualizar `CORS_ORIGINS` con dominio Railway (ej: `https://maat.work`)
3. Redeploy API

## Seguridad

### SSL/TLS Automático

- Railway maneja SSL automáticamente con Let's Encrypt
- No requiere configuración manual
- Renovación automática de certificados
- HTTPS forzado por defecto

### Variables de Entorno

- **Secretos**: Nunca comitear en git (`.env` archivos en `.gitignore`)
- **JWT_SECRET**: Usar valor fuerte (>32 caracteres)
- **CORS**: Restringir a dominios de producción

### Recomendaciones para Producción

- [x] SSL/TLS automático por Railway
- [x] Variables de entorno gestionadas en dashboard
- [x] Migraciones automáticas pre-deploy
- [ ] Rate limiting configurado en API
- [ ] Logs monitoreados regularmente
- [ ] Backups de base de datos (Railway tiene backups automáticos)

## Soporte

Para problemas o preguntas, abre un issue en el repositorio.

## Arquitectura AWS (Histórica)

> ℹ️ Información de la arquitectura AWS anterior en `infrastructure/aws-deprecated/README.md`

La arquitectura AWS migrada usaba:
- EC2 t3.small (PM2 process manager)
- RDS PostgreSQL t3.micro
- S3 bucket para logs
- Cloudflare para DNS/SSL/WAF

Costo AWS: ~$30-35/mes vs Railway: ~$15/mes (50% ahorro)
