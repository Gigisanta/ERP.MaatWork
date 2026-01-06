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
├── terraform/                    # Configuración Terraform
│   ├── modules/
│   │   ├── aws-compute/          # EC2, Elastic IP, Security Groups, IAM
│   │   ├── aws-database/         # RDS PostgreSQL, Secrets Manager
│   │   ├── aws-storage/          # S3 Logs Bucket
│   │   └── cloudflare/           # DNS, SSL, WAF
│   ├── environments/
│   │   ├── dev/                  # Configuración desarrollo
│   │   └── prod/                 # Configuración producción
│   ├── main.tf                   # Root module
│   ├── README.md                 # Documentación detallada Terraform
│   └── MIGRATION.md              # Guía de migración desde CDK
├── mvp/
│   └── nginx.conf                # Configuración Nginx (SSL/HTTPS con Cloudflare)
├── scripts/
│   ├── deploy.sh                 # Script deployment Unix
│   └── deploy.ps1                # Script deployment Windows
└── README.md                     # Este archivo
```

## Recursos AWS

| Recurso | Tipo | Descripción | Costo Est. |
|---------|------|-------------|------------|
| EC2 Instance | t3.small | Servidor principal (2 vCPU, 2GB RAM) | ~$15/mes |
| Elastic IP | - | IP fija para el servidor | $0 (asociada) |
| RDS PostgreSQL | t3.micro | Base de datos (20GB) | $0 (Free Tier) |
| S3 Bucket | - | Logs con lifecycle | ~$0.50/mes |
| Secrets Manager | - | Credenciales de DB | ~$0.40/mes |
| Security Groups | 2 | EC2 + RDS | $0 |
| IAM Role | - | Permisos para EC2 | $0 |

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

- [Terraform README](./terraform/README.md) - Documentación completa de Terraform
- [Guía de Migración](./terraform/MIGRATION.md) - Migración desde CDK

## Sistema de Logs

Los logs se gestionan de forma económica:

1. **PM2** gestiona los procesos y escribe logs localmente
2. **S3 Lifecycle** mueve logs a Glacier después de 30 días y los elimina después de 90

**Costo aproximado:** ~$0.023/GB (vs ~$0.50/GB de CloudWatch Logs)

```bash
# Ver logs en tiempo real
pm2 logs

# Ver logs de un servicio específico
pm2 logs maatwork-api
```

## Mantenimiento

### Ver estado de infraestructura

```bash
cd infrastructure/terraform/environments/dev
terraform show
```

### Actualizar infraestructura

```bash
terraform plan   # Ver cambios
terraform apply  # Aplicar cambios
```

### Destruir infraestructura (¡cuidado!)

```bash
terraform destroy
```

## Troubleshooting

### Error: "VPC not found"

El modo MVP usa la VPC por defecto. Si no existe:
```bash
aws ec2 create-default-vpc
```

### Error: "Insufficient permissions"

Verificar que el usuario IAM tenga permisos para:
- EC2, VPC
- RDS, Secrets Manager
- S3
- IAM

## Seguridad

### SSL/TLS con Cloudflare

El proyecto está configurado para usar **Cloudflare Origin CA Certificate** con modo **Full (Strict)**:

- ✅ Certificados SSL instalados en `/etc/ssl/cloudflare/`
- ✅ Nginx configurado para escuchar en puerto 443 (HTTPS)
- ✅ HTTP (80) redirige automáticamente a HTTPS (443)
- ✅ Security Group restringido solo a rangos IP de Cloudflare

**Configuración de Nginx:**
- Archivo: `infrastructure/mvp/nginx.conf`
- Certificado: `/etc/ssl/cloudflare/origin.crt`
- Clave privada: `/etc/ssl/cloudflare/origin.key`
- Protocolos: TLSv1.2, TLSv1.3
- HTTP/2 habilitado

**Verificar configuración SSL:**
```bash
# Verificar que nginx escucha en puerto 443
sudo ss -tulpn | grep :443

# Verificar certificados
sudo ls -la /etc/ssl/cloudflare/
```

### Recomendaciones para Producción

- [x] SSL/TLS habilitado con Cloudflare (Full Strict)
- [x] Security Group restringido a rangos Cloudflare
- [ ] Limitar acceso SSH por IP específicas
- [ ] Configurar WAF en Cloudflare
- [ ] Rotar credenciales periódicamente

## Soporte

Para problemas o preguntas, abre un issue en el repositorio.
