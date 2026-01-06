# 🔐 Obtener Credenciales de RDS

## Opción 1: Verificar en AWS Secrets Manager (Recomendado)

Si las credenciales están guardadas en Secrets Manager:

```bash
# Conectarte al servidor o usar AWS CLI localmente
aws secretsmanager list-secrets --region sa-east-1 | grep -i rds

# Ver el secreto específico (reemplaza con el nombre real)
aws secretsmanager get-secret-value \
  --secret-id cactus-mvp-dev/database \
  --region sa-east-1 \
  --query SecretString \
  --output text | jq -r

# O si el formato es diferente
aws secretsmanager get-secret-value \
  --secret-id maatwork/mvp/db-credentials \
  --region sa-east-1 \
  --query SecretString \
  --output text
```

**Desde AWS Console:**
1. Ve a AWS Console → Secrets Manager
2. Busca secretos relacionados con "cactus", "mvp", "database", o "rds"
3. Click en el secreto → "Retrieve secret value"
4. Verás el JSON con `username` y `password`

## Opción 2: Verificar en CloudFormation/CDK (si usas infraestructura como código)

```bash
# Ver los outputs de CloudFormation
aws cloudformation describe-stacks \
  --stack-name cactus-mvp-dev \
  --region sa-east-1 \
  --query 'Stacks[0].Outputs'

# O si usas CDK
cd infrastructure/cdk
cdk list
cdk synth
```

## Opción 3: Verificar en el código de infraestructura

Busca en:
- `infrastructure/terraform/` - Si usas Terraform
- `infrastructure/cdk/` - Si usas CDK
- `infrastructure/cloudformation/` - Si usas CloudFormation

```bash
# Buscar referencias a credenciales de RDS
grep -r "username\|password\|master" infrastructure/ --include="*.tf" --include="*.ts" --include="*.yaml"
```

## Opción 4: Resetear la contraseña de RDS (si no encuentras las credenciales)

⚠️ **Solo si no puedes encontrar las credenciales originales**

### Desde AWS Console:

1. Ve a AWS Console → RDS → Databases
2. Selecciona tu instancia: `cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92`
3. Click en "Modify"
4. En "Master password" → "Change master password"
5. Ingresa una nueva contraseña (guárdala en un lugar seguro)
6. Click "Continue" → "Modify DB instance"
7. Espera a que se complete la modificación (~5-10 minutos)

### Desde AWS CLI:

```bash
# Resetear contraseña
aws rds modify-db-instance \
  --db-instance-identifier cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92 \
  --master-user-password "TuNuevaPasswordSegura123!" \
  --apply-immediately \
  --region sa-east-1
```

⚠️ **Nota:** Esto causará un breve downtime mientras RDS reinicia.

## Opción 5: Verificar en archivos de configuración del servidor

Si ya tienes la aplicación corriendo, las credenciales pueden estar en:

```bash
# En el servidor, buscar en archivos de configuración
ssh ec2-user@56.125.148.180

# Buscar en .env actual
cat /home/ec2-user/abax/apps/api/.env | grep DATABASE_URL

# Buscar en otros archivos
find /home/ec2-user -name "*.env*" -o -name "*config*" | xargs grep -l "DATABASE_URL" 2>/dev/null

# Ver variables de entorno de procesos corriendo
pm2 env api | grep DATABASE_URL
```

## Opción 6: Obtener el usuario maestro desde RDS

El usuario maestro por defecto suele ser:
- `postgres` (PostgreSQL)
- `admin` (algunas configuraciones)
- `root` (MySQL/MariaDB)

Para verificar:

```bash
# Ver detalles de la instancia RDS
aws rds describe-db-instances \
  --db-instance-identifier cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92 \
  --region sa-east-1 \
  --query 'DBInstances[0].MasterUsername' \
  --output text
```

## Una vez que tengas las credenciales

### Actualizar el .env

```env
DATABASE_URL=postgresql://USUARIO:PASSWORD@cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92.c5oaie0qy73q.sa-east-1.rds.amazonaws.com:5432/CRM
```

⚠️ **Nota:** Hay un espacio extra en tu DATABASE_URL actual. Debe ser:
```env
DATABASE_URL=postgresql://usuario:password@cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92.c5oaie0qy73q.sa-east-1.rds.amazonaws.com:5432/CRM
```

### Probar la conexión

```bash
# Desde el servidor
psql "postgresql://usuario:password@cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92.c5oaie0qy73q.sa-east-1.rds.amazonaws.com:5432/CRM"

# O desde tu máquina local (si tienes psql)
psql "postgresql://usuario:password@cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92.c5oaie0qy73q.sa-east-1.rds.amazonaws.com:5432/CRM"
```

## Comandos útiles para buscar

```bash
# Buscar en todos los lugares posibles
echo "=== Secrets Manager ==="
aws secretsmanager list-secrets --region sa-east-1 | grep -i -E "(cactus|mvp|rds|database)"

echo "=== CloudFormation Outputs ==="
aws cloudformation describe-stacks --region sa-east-1 --query 'Stacks[*].StackName' --output text

echo "=== RDS Master Username ==="
aws rds describe-db-instances \
  --db-instance-identifier cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92 \
  --region sa-east-1 \
  --query 'DBInstances[0].MasterUsername' \
  --output text
```
