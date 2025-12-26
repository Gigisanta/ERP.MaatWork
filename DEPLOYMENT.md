# Guía de Deployment CI/CD para MaatWork

Esta guía te llevará paso a paso desde cero hasta tener tu aplicación corriendo en AWS con CI/CD completo.

## Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Configuración de Cuentas AWS](#configuración-de-cuentas-aws)
3. [Setup Local](#setup-local)
4. [Deployment de Infraestructura](#deployment-de-infraestructura)
5. [Configuración de GitHub Actions](#configuración-de-github-actions)
6. [Primer Deployment](#primer-deployment)
7. [Workflows de Desarrollo](#workflows-de-desarrollo)
8. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## Prerequisitos

### Herramientas Necesarias

- [ ] Node.js >= 22.0.0
- [ ] pnpm >= 9.10.0
- [ ] AWS CLI instalado y configurado
- [ ] Docker instalado (para builds locales)
- [ ] Git configurado con acceso a GitHub

### Cuentas Requeridas

- [ ] 2 cuentas AWS (una para DEV, otra para PROD)
- [ ] Cuenta GitHub con permisos de admin en el repo
- [ ] Tarjeta de crédito/débito para cada cuenta AWS

---

## Configuración de Cuentas AWS

### Paso 1: Crear Cuentas AWS

1. **Cuenta DEV**:
   - Ve a [aws.amazon.com/free](https://aws.amazon.com/free)
   - Crea cuenta con email único (ej: `tu-email+dev@gmail.com`)
   - Habilita MFA en la cuenta root
   - Configura billing alerts (presupuesto: $30/mes)

2. **Cuenta PROD**:
   - Repite el proceso con email diferente (ej: `tu-email+prod@gmail.com`)
   - Habilita MFA
   - Configura billing alerts (presupuesto: $150/mes)

### Paso 2: Crear IAM Users para Deployment

**En CADA cuenta (DEV y PROD):**

1. Inicia sesión en AWS Console
2. Ve a IAM > Users > Create User
3. Nombre: `maatwork-deployer`
4. Habilita "Access key - Programmatic access"
5. Adjunta las siguientes políticas:
   - `AdministratorAccess` (para simplificar, en producción usar política más restrictiva)
6. **GUARDA las credenciales**:
   - Access Key ID
   - Secret Access Key

> ⚠️ **IMPORTANTE**: Nunca compartir estas credenciales ni commitearlas al repo.

### Paso 3: Configurar AWS CLI

Desde la raíz del proyecto:

```bash
bash scripts/setup-aws.sh
```

Este script te pedirá:
- Access Key ID
- Secret Access Key
- Región (recomendado: `us-east-1`)
- Output format (dejar: `json`)

Creará dos perfiles:
- `maatwork-dev`
- `maatwork-prod`

Verifica que funcione:

```bash
aws sts get-caller-identity --profile maatwork-dev
aws sts get-caller-identity --profile maatwork-prod
```

---

## Setup Local

### Paso 1: Instalar Dependencias CDK

```bash
cd infrastructure/cdk
pnpm install
```

### Paso 2: Bootstrap CDK

Esto prepara tu cuenta AWS para usar CDK (solo la primera vez):

```bash
# Cuenta DEV
export AWS_PROFILE=maatwork-dev
pnpm cdk bootstrap

# Cuenta PROD
export AWS_PROFILE=maatwork-prod
pnpm cdk bootstrap
```

Deberías ver:
```
✅ Environment aws://ACCOUNT_ID/us-east-1 bootstrapped.
```

---

## Deployment de Infraestructura

### Paso 1: Preview de Infraestructura

Antes de deployar, revisa qué se va a crear:

```bash
export AWS_PROFILE=maatwork-dev
cd infrastructure/cdk
pnpm synth:dev
```

Esto genera CloudFormation templates en `cdk.out/`.

### Paso 2: Deploy a DEV

```bash
export AWS_PROFILE=maatwork-dev
pnpm deploy:dev
```

CDK desplegará 4 stacks en orden:

1. ✅ **MaatWorkDev-Network** (~5 min)
   - VPC, subnets, NAT gateway, VPC endpoints

2. ✅ **MaatWorkDev-Database** (~10 min)
   - RDS PostgreSQL 16 (db.t3.micro)

3. ✅ **MaatWorkDev-Compute** (~8 min)
   - ECS Cluster
   - ALB
   - ECR repositories (vacíos por ahora)

4. ✅ **MaatWorkDev-Monitoring** (~3 min)
   - CloudWatch Dashboard
   - Alarmas
   - Budget alerts

**Tiempo total: ~25-30 minutos**

### Paso 3: Guardar Outputs

Al final del deployment, verás outputs importantes:

```
Outputs:
MaatWorkDev-Compute.LoadBalancerDNS = maatwork-dev-alb-123456789.us-east-1.elb.amazonaws.com
MaatWorkDev-Compute.ApiRepoUri = 123456789.dkr.ecr.us-east-1.amazonaws.com/maatwork/api-dev
MaatWorkDev-Compute.WebRepoUri = 123456789.dkr.ecr.us-east-1.amazonaws.com/maatwork/web-dev
MaatWorkDev-Database.DBEndpoint = maatworkdb-dev.abc123.us-east-1.rds.amazonaws.com
```

**Guarda estos valores**, los necesitarás para GitHub Secrets.

### Paso 4: Configurar Email de Alarmas

1. Ve a AWS Console > Simple Notification Service (SNS)
2. Busca el topic `maatwork-dev-alarms`
3. Subscripciones > Create subscription
4. Protocol: Email
5. Endpoint: tu email
6. Confirma el email que recibirás

### Paso 5: (Opcional) Deploy a PROD

**Solo cuando estés listo para producción:**

```bash
export AWS_PROFILE=maatwork-prod
cd infrastructure/cdk
pnpm deploy:prod
```

Repite los pasos 3 y 4 para prod.

---

## Configuración de GitHub Actions

### Paso 1: Configurar GitHub Secrets

1. Ve a tu repo en GitHub
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"

Agrega los siguientes secrets:

**Para DEV:**
- `AWS_ACCOUNT_ID_DEV`: Tu Account ID de dev
- `AWS_ACCESS_KEY_ID_DEV`: Access Key del IAM user dev
- `AWS_SECRET_ACCESS_KEY_DEV`: Secret Key del IAM user dev
- `DEV_API_URL`: `http://TU_ALB_DNS_DEV` (del output LoadBalancerDNS)

**Para PROD:**
- `AWS_ACCOUNT_ID_PROD`: Tu Account ID de prod
- `AWS_ACCESS_KEY_ID_PROD`: Access Key del IAM user prod
- `AWS_SECRET_ACCESS_KEY_PROD`: Secret Key del IAM user prod
- `PROD_API_URL`: `http://TU_ALB_DNS_PROD`

### Paso 2: Configurar GitHub Environments

1. Settings > Environments > New environment
2. Crea dos environments:
   - `development`
   - `production`

3. Para `production`:
   - Environment protection rules > Required reviewers
   - Agrega tu usuario como reviewer
   - Esto fuerza aprobación manual para deployments a prod

---

## Primer Deployment

### Paso 1: Build Local de Docker Images

Primero, verifica que los Dockerfiles funcionan:

```bash
# Desde la raíz del proyecto

# Build API
docker build -f apps/api/Dockerfile -t maatwork-api:local .

# Build Web
docker build -f apps/web/Dockerfile -t maatwork-web:local .

# Build Analytics
docker build -f apps/analytics-service/Dockerfile -t maatwork-analytics:local .
```

Si hay errores, corrígelos antes de continuar.

### Paso 2: Push Manual a DEV (Primera vez)

Como las task definitions de ECS esperan imágenes en ECR, necesitamos hacer un push manual la primera vez:

```bash
# Login a ECR
export AWS_PROFILE=maatwork-dev
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag y push API
docker tag maatwork-api:local ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cactus/api-dev:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cactus/api-dev:latest

# Tag y push Web
docker tag maatwork-web:local ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cactus/web-dev:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cactus/web-dev:latest

# Tag y push Analytics
docker tag maatwork-analytics:local ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cactus/analytics-dev:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cactus/analytics-dev:latest
```

### Paso 3: Verificar Deployment

1. Ve a AWS Console > ECS > Clusters > maatwork-dev
2. Verifica que los 3 servicios estén corriendo:
   - `api` (1 task running en dev)
   - `web` (1 task running)
   - `analytics` (1 task running)

3. Prueba los endpoints:

```bash
ALB_DNS="tu-alb-dns-dev.us-east-1.elb.amazonaws.com"

# API health
curl http://$ALB_DNS/health

# Web app
curl http://$ALB_DNS:8080

# Analytics
curl http://$ALB_DNS:3002/health
```

---

## Workflows de Desarrollo

### Flujo de Trabajo Diario

1. **Desarrollo local**:
   ```bash
   pnpm dev  # Consola única con logs coloreados
   ```

2. **Crear feature branch**:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

3. **Hacer cambios y commit**:
   ```bash
   git add .
   git commit -m "feat: agregar nueva funcionalidad"
   git push origin feature/nueva-funcionalidad
   ```

4. **Crear Pull Request en GitHub**:
   - El CI workflow se ejecutará automáticamente
   - Verifica que todos los tests pasen ✅
   - **Si los tests fallan, NO se puede mergear**

5. **Review y Merge**:
   - Otro dev revisa el PR
   - Merge a `main` o `develop`

6. **Deploy a DEV (manual)**:
   - Ve a Actions > Deploy to DEV
   - Click "Run workflow"
   - Selecciona service: `all` (o específico)
   - Click "Run workflow"
   - Espera ~10 minutos

7. **Verificar deployment en DEV**:
   ```bash
   curl http://tu-alb-dev/health
   ```

8. **Deploy a PROD (manual con aprobación)**:
   - Ve a Actions > Deploy to PROD
   - Click "Run workflow"
   - Selecciona service: `all`
   - Click "Run workflow"
   - **Espera aprobación manual en GitHub**
   - Después de aprobar, espera ~15 minutos
   - Se ejecutan smoke tests automáticamente

### Deployar Solo un Servicio

Si solo cambiaste la API por ejemplo:

1. Actions > Deploy to DEV
2. Service: `api`
3. Run workflow

Esto solo rebuildeará y deployará la API, ahorrando tiempo.

---

## Monitoreo y Mantenimiento

### CloudWatch Dashboard

1. Ve a AWS Console > CloudWatch > Dashboards
2. Selecciona `MaatWork-dev` o `MaatWork-prod`
3. Verás métricas en tiempo real:
   - CPU/Memory de ECS
   - Request count del ALB
   - Latencia
   - Errores 4xx/5xx
   - Targets saludables

### Revisar Logs

**Desde AWS Console:**
1. CloudWatch > Log groups
2. Busca:
   - `/ecs/maatwork-dev/api`
   - `/ecs/maatwork-dev/web`
   - `/ecs/maatwork-dev/analytics`

**Desde CLI:**
```bash
aws logs tail /ecs/maatwork-dev/api --follow --profile maatwork-dev
```

### Alarmas

Recibirás emails cuando:
- CPU > 80%
- Memoria > 85%
- Muchos errores 5xx
- Targets no saludables
- Presupuesto supera 80%

### Costos

Revisa gastos semanalmente:
1. AWS Console > Billing > Bills
2. Filtra por tags:
   - `Project: MaatWork`
   - `Environment: dev` o `prod`

### Backup de Base de Datos

RDS hace backups automáticos diarios.

**Restaurar desde backup:**
1. RDS > Snapshots
2. Selecciona snapshot
3. Actions > Restore snapshot
4. Configura nueva instancia

### Rollback de Deployment

Si un deployment falla:

```bash
# Ver versiones anteriores de task definition
aws ecs list-task-definitions --family-prefix maatwork-api-dev --profile maatwork-dev

# Rollback a versión anterior
aws ecs update-service \
  --cluster maatwork-dev \
  --service api \
  --task-definition maatwork-api-dev:PREVIOUS_VERSION \
  --profile maatwork-dev
```

O simplemente hacer otro deployment con código anterior.

---

## Troubleshooting

### Error: "Service failed to stabilize"

**Causa**: ECS tasks están crasheando.

**Solución**:
1. Ve a ECS > Cluster > maatwork-dev > Service > Tasks
2. Click en el task que falló
3. Revisa logs en "Logs" tab
4. Corrige el error en código
5. Redeploy

### Error: "No space left on device" en Docker build

**Solución**:
```bash
docker system prune -a --volumes
```

### Error: "Cannot connect to database"

**Causa**: Security groups.

**Solución**:
1. Ve a EC2 > Security Groups
2. Busca el SG del ECS task
3. Verifica que tenga regla de egress a puerto 5432
4. Busca el SG de RDS
5. Verifica que acepte ingress desde ECS SG en puerto 5432

### Deployment muy lento

**Si los builds de Docker toman >15 min:**

1. Verifica que GitHub Actions cache funcione:
   - Actions > Cache usado
   - Debería decir "Cache hit"

2. Considera usar AWS CodeBuild en lugar de GitHub Actions para builds

---

## Próximos Pasos

- [ ] Configurar dominio custom (Route 53 + ACM)
- [ ] Habilitar HTTPS en ALB
- [ ] Configurar auto-scaling basado en tiempo (scale down de noche)
- [ ] Implementar blue/green deployments
- [ ] Agregar integration tests en pipeline
- [ ] Configurar Datadog/New Relic para APM
- [ ] Implementar canary deployments

---

## Recursos Adicionales

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS CDK Examples](https://github.com/aws-samples/aws-cdk-examples)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Drizzle ORM Migrations](https://orm.drizzle.team/kit-docs/overview)

---

## Soporte

Si tienes problemas:

1. Revisa los logs de CloudWatch
2. Verifica GitHub Actions logs
3. Consulta la sección Troubleshooting
4. Revisa issues en el repo
