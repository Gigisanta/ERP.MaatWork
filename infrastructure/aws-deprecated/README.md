# AWS-Deprecated Infrastructure
# ==========================
# AI_DECISION: Archivo README para código AWS deprecated
# Justificación: Migración completada a Railway, preservando código para referencia
# Impacto: Documentación clara que este código ya no se usa en producción
# Referencias: Plan maestro de migración a Railway v2.0
#
# ESTE DIRECTORIO CONTIENE CÓDIGO AWS QUE NO SE USA MÁS
# ================================================
#
# Contenido:
# - terraform/: Todo el código IaC para AWS (EC2, RDS, S3, Cloudflare)
# - deploy.sh, deploy.ps1: Scripts de deployment para AWS
# - nginx.conf: Configuración Nginx para SSL/HTTPS con Cloudflare
#
# ¿Por qué se archivó en lugar de eliminar?
# - Preserva historial de infraestructura
# - Facilita rollback si es necesario
# - Documentación de arquitectura previa para referencia
#
# ¿Cómo se usaba?
# ================
# 1. Terraform creaba recursos AWS:
#    - EC2 t3.small (PM2 + API + Web + Analytics)
#    - RDS PostgreSQL t3.micro
#    - S3 bucket para logs
#    - Cloudflare para DNS/SSL/WAF
#
# 2. Deployment:
#    - SSH al servidor EC2
#    - Ejecutar scripts/deploy.sh
#    - PM2 gestionaba procesos (pm2 start ecosystem.config.js)
#
# Arquitectura previa:
# ===================
# ┌─────────────────────────────────────────────────────────────┐
# │                       Cloudflare                            │
# │  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
# │  │   DNS   │  │   SSL   │  │   WAF   │                     │
# │  └────┬────┘  └────┬────┘  └────┬────┘                     │
# └───────┼────────────┼────────────┼───────────────────────────┘
#         │            │            │
#         └────────────┴────────────┘
#                      │
#                      ▼
# ┌─────────────────────────────────────────────────────────────┐
# │                         AWS                                 │
# │  ┌─────────────────────────────────────────────────────┐   │
# │  │                    Default VPC                       │   │
# │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
# │  │  │  EC2 (PM2)  │  │     RDS     │  │   S3 Logs   │  │   │
# │  │  │  + Elastic  │  │  PostgreSQL │  │   Bucket    │  │   │
# │  │  │     IP      │  │             │  │             │  │   │
# │  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
# │  └─────────────────────────────────────────────────────┘   │
# └─────────────────────────────────────────────────────────────┘
#
# Nueva arquitectura (Railway):
# ============================
# ┌─────────────────────────────────────────────────────┐
# │                  Railway Platform                   │
# │  ┌──────────┐  ┌──────────┐  ┌────────┐  │
# │  │ API (Node)│  │ Web (Next)│  │Postgres │  │
# │  └──────────┘  └──────────┘  └────────┘  │
# │  Managed services + automatic SSL/DNS            │
# └─────────────────────────────────────────────────────┘
#
# Costos comparativos (mensuales):
# =============================
# AWS (production):
# - EC2 t3.small: ~$15
# - RDS t3.micro: ~$15 (sin Free Tier)
# - S3: ~$0.50
# - Cloudflare: $0
# - Total: ~$30-35
#
# Railway (equivalente):
# - API (0.5GB RAM): ~$5
# - Web (0.5GB RAM): ~$5
# - PostgreSQL (0.5GB): ~$5
# - Total: ~$15 (50% de ahorro)
#
# Recursos adicionales:
# =================
# - infrastructure/scripts/: Contiene scripts utilitarios que siguen siendo útiles
# - docs/: Documentación general que aplica a Railway
# - docker-compose.yml: Configuración local (invariable)
#
# Migración de vuelta a AWS (si es necesario):
# ==========================================
# 1. Restaurar ecosystem.config.aws.js → ecosystem.config.js
# 2. Restaurar infrastructure/aws-deprecated/ → infrastructure/terraform
# 3. Restaurar infrastructure/aws-deprecated/deploy.* → infrastructure/scripts/
# 4. Restaurar infrastructure/aws-deprecated/nginx.conf → infrastructure/mvp/nginx.conf
# 5. Seguir guías en infrastructure/aws-deprecated/terraform/README.md
# 6. Actualizar variables de entorno (AWS credentials, etc.)
