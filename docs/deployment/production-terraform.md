# Guía de Deployment para MaatWork

Esta guía detalla el proceso de despliegue de la infraestructura y la aplicación MaatWork utilizando Terraform y AWS.

## Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Configuración de Cuentas AWS](#configuración-de-cuentas-aws)
3. [Setup Local de Terraform](#setup-local-de-terraform)
4. [Despliegue de Infraestructura](#despliegue-de-infraestructura)
5. [Despliegue de la Aplicación](#despliegue-de-la-aplicación)
6. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## Prerequisitos

- **Node.js**: >= 22.0.0
- **pnpm**: >= 9.10.0
- **Terraform**: CLI instalado
- **AWS CLI**: Instalado y configurado con perfiles `maatwork-dev` y `maatwork-prod`
- **Cuenta Cloudflare**: Para gestión de DNS (opcional)

---

## Configuración de Cuentas AWS

### Paso 1: Configurar Perfiles

Asegúrate de tener tus credenciales en `~/.aws/credentials`:

```ini
[maatwork-dev]
aws_access_key_id = TU_ACCESS_KEY
aws_secret_access_key = TU_SECRET_KEY

[maatwork-prod]
aws_access_key_id = TU_ACCESS_KEY
aws_secret_access_key = TU_SECRET_KEY
```

---

## Setup Local de Terraform

### Paso 1: Configurar Backend (S3 + DynamoDB)

Terraform usa S3 para el estado y DynamoDB para el bloqueo.

```bash
# Crear bucket para el estado (ejemplo para dev)
aws s3 mb s3://maatwork-terraform-state-dev --region us-east-1 --profile maatwork-dev

# Crear tabla para bloqueo
aws dynamodb create-table \
  --table-name maatwork-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 \
  --profile maatwork-dev
```

---

## Despliegue de Infraestructura

### Paso 1: Inicializar Terraform

```bash
cd infrastructure/terraform/environments/dev
terraform init
```

### Paso 2: Configurar Variables

Crea un archivo `terraform.tfvars`:

```hcl
environment = "dev"
aws_region  = "us-east-1"
db_password = "tu-password-seguro"
# Otros valores según terraform.tfvars.example
```

### Paso 3: Aplicar Cambios

```bash
terraform plan
terraform apply
```

Esto creará:

- **VPC & Red**: Subnets públicas/privadas.
- **RDS**: Base de datos PostgreSQL.
- **EC2**: Instancia para la aplicación (con PM2/Docker).
- **Security Groups**: Reglas de firewall.

---

## Despliegue de la Aplicación

### Paso 1: GitHub Actions

El repositorio usa GitHub Actions para desplegar automáticamente a la instancia EC2.

1. Configura los **Secrets** en GitHub:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `EC2_HOST`: IP de la instancia creada.
   - `SSH_PRIVATE_KEY`: Clave para acceder a la EC2.

2. Ejecuta el workflow **Deploy to PROD**.

---

## Monitoreo y Mantenimiento

### Comandos Útiles en el Servidor (SSH)

```bash
# Ver estado de los servicios
pm2 status

# Ver logs en tiempo real
pm2 logs

# Reiniciar servicios
pm2 restart all
```

### Troubleshooting

- **Error de Conexión a DB**: Verifica que el Security Group de RDS acepte tráfico desde la EC2 en el puerto 5432.
- **Error de DNS**: Asegúrate de que el registro A en Cloudflare apunte a la IP correcta.

---

## Recursos

- [Terraform Docs](https://www.terraform.io/docs)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
