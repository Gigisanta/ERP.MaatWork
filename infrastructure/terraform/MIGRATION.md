# Migración de CDK a Terraform

Guía paso a paso para migrar la infraestructura existente de AWS CDK a Terraform.

## Prerrequisitos

1. Terraform >= 1.6.0 instalado
2. AWS CLI configurado
3. Acceso a la cuenta AWS donde están los recursos

## Paso 1: Identificar Recursos Existentes

Ejecutar estos comandos para obtener los IDs de los recursos:

```bash
# Configurar variables
ENVIRONMENT="dev"  # o "prod"
PROJECT="maatwork"

# EC2 Instance
EC2_INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${PROJECT}-${ENVIRONMENT}-instance" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)
echo "EC2 Instance: $EC2_INSTANCE_ID"

# Elastic IP
EIP_ALLOCATION_ID=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=${PROJECT}-${ENVIRONMENT}-eip" \
  --query 'Addresses[0].AllocationId' \
  --output text)
echo "Elastic IP: $EIP_ALLOCATION_ID"

# Security Group (EC2)
EC2_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${PROJECT}-${ENVIRONMENT}-instance-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)
echo "EC2 Security Group: $EC2_SG_ID"

# RDS Instance
RDS_IDENTIFIER="${PROJECT}-${ENVIRONMENT}-database"
echo "RDS Identifier: $RDS_IDENTIFIER"

# RDS Security Group
RDS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${PROJECT}-${ENVIRONMENT}-database-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)
echo "RDS Security Group: $RDS_SG_ID"

# S3 Bucket
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="${PROJECT}-${ENVIRONMENT}-logs-${AWS_ACCOUNT_ID}"
echo "S3 Bucket: $S3_BUCKET"

# Secrets Manager
SECRET_ARN=$(aws secretsmanager list-secrets \
  --filters Key=name,Values="${PROJECT}-${ENVIRONMENT}/db-credentials" \
  --query 'SecretList[0].ARN' \
  --output text)
echo "Secret ARN: $SECRET_ARN"

# IAM Role
IAM_ROLE_NAME="${PROJECT}-${ENVIRONMENT}-instance-role"
echo "IAM Role: $IAM_ROLE_NAME"

# IAM Instance Profile
IAM_PROFILE_NAME="${PROJECT}-${ENVIRONMENT}-instance-profile"
echo "IAM Instance Profile: $IAM_PROFILE_NAME"

# DB Subnet Group
DB_SUBNET_GROUP="${PROJECT}-${ENVIRONMENT}-db-subnet-group"
echo "DB Subnet Group: $DB_SUBNET_GROUP"
```

## Paso 2: Configurar Terraform

```bash
cd infrastructure/terraform/environments/${ENVIRONMENT}

# Copiar configuración
cp terraform.tfvars.example terraform.tfvars

# Editar terraform.tfvars con tus valores
```

## Paso 3: Inicializar Terraform

```bash
terraform init
```

## Paso 4: Importar Recursos

Ejecutar los imports en orden (respetando dependencias):

```bash
# 1. Storage (sin dependencias)
terraform import 'module.maatwork.module.storage.aws_s3_bucket.logs' "$S3_BUCKET"

# 2. IAM (sin dependencias)
terraform import 'module.maatwork.module.compute.aws_iam_role.instance' "$IAM_ROLE_NAME"
terraform import 'module.maatwork.module.compute.aws_iam_instance_profile.instance' "$IAM_PROFILE_NAME"

# 3. Security Groups
terraform import 'module.maatwork.module.compute.aws_security_group.instance' "$EC2_SG_ID"
terraform import 'module.maatwork.module.database.aws_security_group.database' "$RDS_SG_ID"

# 4. Secrets Manager
terraform import 'module.maatwork.module.database.aws_secretsmanager_secret.db_credentials' "$SECRET_ARN"

# 5. Database
terraform import 'module.maatwork.module.database.aws_db_subnet_group.main' "$DB_SUBNET_GROUP"
terraform import 'module.maatwork.module.database.aws_db_instance.main' "$RDS_IDENTIFIER"

# 6. Compute
terraform import 'module.maatwork.module.compute.aws_instance.main' "$EC2_INSTANCE_ID"
terraform import 'module.maatwork.module.compute.aws_eip.main' "$EIP_ALLOCATION_ID"
```

## Paso 5: Verificar Estado

```bash
# Ver recursos importados
terraform state list

# Verificar que no haya cambios pendientes
terraform plan
```

Si `terraform plan` muestra cambios, puede ser por:

1. **Diferencias en configuración**: Ajustar `terraform.tfvars` para que coincida
2. **Atributos de solo lectura**: Agregar `ignore_changes` en el lifecycle
3. **Recursos adicionales de CDK**: Importar recursos faltantes

## Paso 6: Ajustar Configuración

Si hay diferencias, editar `terraform.tfvars` para que coincida con la configuración actual:

```hcl
# Ejemplo: si el instance_type actual es t3.medium
instance_type = "t3.medium"

# Si el volumen es 50GB
volume_size = 50
```

## Paso 7: Validar Migración

```bash
# Debe mostrar "No changes. Your infrastructure matches the configuration."
terraform plan
```

## Paso 8: Eliminar CDK

Una vez que Terraform gestione todos los recursos correctamente:

### 8.1 Eliminar directorio CDK

```bash
# Desde la raíz del proyecto
rm -rf infrastructure/cdk
```

### 8.2 Actualizar package.json

Remover las siguientes dependencias:

```json
{
  "devDependencies": {
    "aws-cdk": "REMOVE",
    "aws-cdk-lib": "REMOVE",
    "constructs": "REMOVE",
    "@types/aws-cdk": "REMOVE"
  }
}
```

### 8.3 Reinstalar dependencias

```bash
pnpm install
```

## Troubleshooting

### Error: Resource already managed by Terraform

El recurso ya fue importado. Verificar con:
```bash
terraform state list | grep [recurso]
```

### Error: Cannot import non-existent resource

El recurso no existe en AWS o el ID es incorrecto. Verificar:
```bash
aws [servicio] describe-[recursos] --[filtro]
```

### Error: Inconsistent dependency lock file

```bash
terraform init -upgrade
```

### Error: Provider credentials

```bash
# Verificar credenciales
aws sts get-caller-identity

# Si es necesario, reconfigurar
aws configure
```

## Script de Migración Completo

Crear `migrate.sh` con todo el proceso:

```bash
#!/bin/bash
set -e

ENVIRONMENT="${1:-dev}"
PROJECT="maatwork"

echo "=== Migrando $ENVIRONMENT ==="

# Obtener IDs
EC2_INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${PROJECT}-${ENVIRONMENT}-instance" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

# ... (resto de obtención de IDs)

# Cambiar al directorio del environment
cd "infrastructure/terraform/environments/${ENVIRONMENT}"

# Inicializar
terraform init

# Importar recursos
terraform import 'module.maatwork.module.storage.aws_s3_bucket.logs' "$S3_BUCKET"
# ... (resto de imports)

# Verificar
terraform plan

echo "=== Migración completada ==="
```

## Rollback

Si necesitas volver a CDK:

1. No elimines el directorio CDK todavía
2. Usa `terraform state rm` para remover recursos del estado
3. CDK debería reconocer los recursos existentes

```bash
# Remover del estado de Terraform (no elimina recursos)
terraform state rm 'module.maatwork.module.compute.aws_instance.main'
# ... etc
```




