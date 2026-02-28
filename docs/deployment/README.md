# Deployment de MAATWORK

Este directorio contiene toda la documentación de deployment para el proyecto MAATWORK.

## 🚀 ¿Qué guía debo seguir?

### Primer deployment / Pruebas rápidas (MVP)
**Usar**: [`mvp-quickstart.md`](./mvp-quickstart.md)

**Cuándo usar**:
- 🎯 Primer deployment del proyecto
- 🧪 Testing rápido de features
- 💻 Despliegue simple en una sola EC2 instance
- ⏱️ Quieres tener el sistema corriendo en < 2 horas
- 💰 Presupuesto limitado ($15-35/mes)

**Enfoque**:
- Docker Compose + EC2
- Configuración manual simplificada
- Ideal para demo / MVP

---

### Producción escalable (Terraform)
**Usar**: [`production-terraform.md`](./production-terraform.md)

**Cuándo usar**:
- 🏢 Deployment a producción
- 📈 Escalabilidad horizontal requerida
- 🔒 Infraestructura como código (IaC)
- 👥 Múltiples entornos (dev, staging, prod)
- 🚀 CI/CD integrado con GitHub Actions

**Enfoque**:
- Terraform + AWS
- Módulos reutilizables por entorno
- Auto-scaling con ECS Fargate
- RDS Multi-AZ
- CloudFlare para DNS + SSL + WAF

---

## 🔄 Migración de MVP a Producción

Si ya tienes el MVP corriendo y quieres migrar a infraestructura de producción:

1. **Planea la migración**:
   - Lee [`production-terraform.md`](./production-terraform.md)
   - Revisa diferencias de arquitectura
   - Planifica downtime mínimo

2. **Despliega infraestructura nueva**:
   ```bash
   cd infrastructure/terraform/environments/prod
   terraform init
   terraform apply
   ```

3. **Migra datos**:
   - Backup de RDS del MVP
   - Restore en RDS de producción
   - Verifica integridad de datos

4. **Actualiza DNS**:
   - Apunta dominio a nuevo ALB
   - Verifica propagación DNS

5. **Destruye infraestructura MVP** (después de verificar):
   ```bash
   cd infrastructure/terraform/environments/mvp
   terraform destroy
   ```

Ver guía detallada en [`infrastructure/terraform/MIGRATION.md`](../../infrastructure/terraform/MIGRATION.md).

---

## 📚 Documentación Relacionada

| Documento | Descripción |
|------------|-------------|
| [`../OPERATIONS.md`](../OPERATIONS.md) | Monitoreo, mantenimiento, troubleshooting |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Arquitectura del sistema |
| [`../../infrastructure/README.md`](../../infrastructure/README.md) | Documentación completa de infraestructura |
| [`../../infrastructure/terraform/README.md`](../../infrastructure/terraform/README.md) | Detalles de Terraform |
| [`../../infrastructure/grafana/README.md`](../../infrastructure/grafana/README.md) | Dashboards de monitoreo |

---

## 💡 Preguntas Frecuentes

### ¿Cuánto cuesta cada opción?

| Enfoque | Costo Mensual | Escalabilidad | Setup Time |
|---------|---------------|--------------|------------|
| MVP (EC2) | $15-35 | Manual / Redeploy | 1-2 horas |
| Producción (Terraform) | $50-200+ | Auto-scaling / Multi-AZ | 4-8 horas |

### ¿Puedo empezar con MVP y luego migrar?

✅ **Sí**. El diseño permite migración sin pérdida de datos. Ver sección de migración arriba.

### ¿Necesito experiencia previa con AWS?

- **MVP**: Se puede aprender sobre la marcha (documentación paso a paso)
- **Producción**: Recomendable experiencia básica con AWS o Terraform

---

## 🆘 Ayuda

Si encuentras problemas:

1. Ver [`../troubleshooting/`](../troubleshooting/) para problemas comunes
2. Revisa logs en EC2: `ssh user@ip "cd ~/maatwork && docker-compose logs -f"`
3. Abre un issue en el repositorio con detalles del error
