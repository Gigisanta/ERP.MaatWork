# MaatWork - Terraform Infrastructure

Infrastructure as Code para MaatWork usando Terraform. Soporta AWS y Cloudflare.

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

## Estructura

```
terraform/
├── modules/
│   ├── aws-compute/      # EC2, Elastic IP, Security Groups, IAM
│   ├── aws-database/     # RDS PostgreSQL, Secrets Manager
│   ├── aws-storage/      # S3 Logs Bucket
│   └── cloudflare/       # DNS, SSL, WAF
├── environments/
│   ├── dev/              # Desarrollo
│   └── prod/             # Producción
├── main.tf               # Root module
├── variables.tf          # Variables globales
├── outputs.tf            # Outputs globales
├── providers.tf          # AWS + Cloudflare providers
└── versions.tf           # Versiones requeridas
```

## Prerequisitos

1. **Terraform** >= 1.6.0
2. **AWS CLI** configurado con credenciales
3. **Cloudflare API Token** (opcional, para DNS/WAF)

### Instalar Terraform

```bash
# Windows (chocolatey)
choco install terraform

# macOS (homebrew)
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### Configurar AWS

```bash
aws configure
# AWS Access Key ID: [tu-access-key]
# AWS Secret Access Key: [tu-secret-key]
# Default region: us-east-1
```

### Configurar Cloudflare (opcional)

```bash
export CLOUDFLARE_API_TOKEN="tu-token-aqui"
```

## Uso Rápido

### 1. Crear Backend de Estado (una vez)

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

### 3. Inicializar y Aplicar

```bash
# Inicializar
terraform init

# Ver plan
terraform plan

# Aplicar cambios
terraform apply
```

## Migración desde CDK

Si tienes recursos existentes creados con CDK, puedes importarlos a Terraform:

### 1. Obtener IDs de recursos

```bash
# EC2 Instance
aws ec2 describe-instances --filters "Name=tag:Name,Values=maatwork-*" \
  --query 'Reservations[].Instances[].InstanceId' --output text

# Elastic IP
aws ec2 describe-addresses --filters "Name=tag:Name,Values=maatwork-*" \
  --query 'Addresses[].AllocationId' --output text

# RDS
aws rds describe-db-instances \
  --query 'DBInstances[?starts_with(DBInstanceIdentifier, `maatwork-`)].DBInstanceIdentifier' --output text

# S3 Bucket
aws s3 ls | grep maatwork

# Secrets Manager
aws secretsmanager list-secrets \
  --query 'SecretList[?starts_with(Name, `maatwork-`)].ARN' --output text
```

### 2. Importar recursos

Ver [MIGRATION.md](./MIGRATION.md) para instrucciones detalladas.

```bash
# Ejemplo de import
cd environments/dev
terraform init

terraform import module.maatwork.module.compute.aws_instance.main i-0123456789abcdef0
terraform import module.maatwork.module.compute.aws_eip.main eipalloc-0123456789abcdef0
terraform import module.maatwork.module.database.aws_db_instance.main maatwork-dev-database
# ... etc
```

### 3. Validar

```bash
# Debe mostrar "No changes"
terraform plan
```

### 4. Eliminar CDK (después de validar)

Una vez que Terraform gestione todos los recursos:

1. Eliminar el directorio `infrastructure/cdk/`
2. Remover dependencias CDK del `package.json`

## Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | Sí |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | Sí |
| `AWS_DEFAULT_REGION` | AWS Region (default: us-east-1) | No |
| `CLOUDFLARE_API_TOKEN` | Token de API de Cloudflare | Solo si enable_cloudflare=true |

## Recursos Creados

### AWS

| Recurso | Descripción | Costo Estimado |
|---------|-------------|----------------|
| EC2 t3.small | Servidor principal | ~$15/mes |
| RDS db.t3.micro | PostgreSQL 16 | Free Tier / ~$15/mes |
| Elastic IP | IP estática | $0 (asociada) |
| S3 Bucket | Logs | ~$0.50/mes |
| Secrets Manager | Credenciales DB | ~$0.40/mes |

**Total estimado: ~$17-35/mes** (dependiendo de Free Tier)

### Cloudflare (Opcional)

| Recurso | Descripción |
|---------|-------------|
| DNS Records | A record, CNAME |
| SSL/TLS | Full (Strict) mode |
| WAF Rules | Rate limiting, security rules |
| Page Rules | Cache static assets |

**Costo: $0** (plan gratuito es suficiente)

## Troubleshooting

### Error: Backend not initialized

```bash
terraform init -reconfigure
```

### Error: Resource already exists

Importar el recurso existente:
```bash
terraform import [RESOURCE_ADDRESS] [RESOURCE_ID]
```

### Error: Cloudflare API error

Verificar que el token tenga los permisos correctos:
- Zone: Read
- DNS: Edit
- Firewall Services: Edit
- Zone Settings: Edit

## Mantenimiento

### Actualizar Terraform

```bash
terraform init -upgrade
```

### Ver estado actual

```bash
terraform show
```

### Destruir infraestructura (¡cuidado!)

```bash
terraform destroy
```

## Referencias

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Cloudflare Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)




