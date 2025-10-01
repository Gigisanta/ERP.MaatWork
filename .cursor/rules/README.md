# 📚 Reglas del Proyecto - Cactus Dashboard

Este directorio contiene las reglas y estándares de desarrollo del proyecto. **Todas las reglas son OBLIGATORIAS** para mantener consistencia, seguridad y calidad del código.

## 📋 Índice de Reglas

### 1. [Diseño del Sistema](./01-system-design.md) 🏗️
**Qué cubre:**
- Arquitectura general y stack tecnológico
- Estructura de carpetas (frontend, backend, shared)
- Principios de diseño (backend minimalista, seguridad en capas)
- Separación de responsabilidades (componente → store → service)
- TypeScript estricto
- Sistema de colores Cactus
- Patrones de código y naming conventions
- Manejo de errores
- Performance y optimizaciones

**Cuándo leer:**
- ✅ Antes de escribir código nuevo
- ✅ Al crear un nuevo componente o servicio
- ✅ Al decidir dónde poner código nuevo
- ✅ Al revisar código de otros

**Reglas clave:**
- Backend solo para OAuth, proxies y service keys
- RLS habilitado en TODAS las tablas
- Separar: Componente → Store → Service → Utils
- NO usar `any`, usar `unknown` con type guards
- Usar SOLO colores del sistema Cactus

---

### 2. [Arquitectura de Monorepo](./02-monorepo-architecture.md) 🏢
**Qué cubre:**
- Estructura de monorepo objetivo
- Separación clara frontend/backend
- Boundaries de responsabilidad
- Packages compartidos (`shared`, `database`, `config`)
- Gestión de dependencias por workspace
- TypeScript configs por workspace
- Comandos de build y desarrollo
- Plan de migración gradual

**Cuándo leer:**
- ✅ Al agregar nueva dependencia
- ✅ Al compartir código entre frontend/backend
- ✅ Al configurar builds
- ✅ Al planear refactorings

**Reglas clave:**
- Frontend y Backend NO se importan directamente
- Todo lo compartido va en `packages/`
- Dependencias instaladas en workspace específico
- Frontend: UI, routing, estado cliente
- Backend: OAuth, proxies, service keys

---

### 3. [Mejores Prácticas de Seguridad](./03-security-best-practices.md) 🔐
**Qué cubre:**
- Row Level Security (RLS) obligatorio
- Templates de políticas RLS
- Autenticación y autorización (JWT, middleware)
- Validación de datos (Zod schemas)
- Prevención de SQL injection y XSS
- Rate limiting y CORS
- Headers de seguridad
- Logging y auditoría
- Protección de datos sensibles (GDPR)
- Manejo seguro de errores
- Checklist pre-deploy

**Cuándo leer:**
- ✅ SIEMPRE antes de crear una tabla nueva
- ✅ Al crear endpoints de API
- ✅ Al manejar datos de usuarios
- ✅ Antes de cada deploy
- ✅ Al revisar código de seguridad

**Reglas clave:**
- TODAS las tablas con RLS habilitado
- Validar input en backend con Zod
- Rate limiting en endpoints públicos
- Auditar acciones críticas (delete, role change, etc.)
- NO exponer stack traces en producción

---

### 4. [Variables de Entorno y Secretos](./04-environment-secrets.md) 🔑
**Qué cubre:**
- Jerarquía de sensibilidad (crítico, sensible, público)
- Estructura de archivos `.env`
- Naming conventions (`VITE_` para frontend, sin prefijo para backend)
- Acceso a variables (frontend vs backend)
- Validación de variables con Zod
- Configuración por entorno (dev, production)
- Rotación de secretos
- Qué hacer si commiteaste un secreto
- Pre-commit hooks
- Documentación de secretos

**Cuándo leer:**
- ✅ Al agregar nueva API key o secreto
- ✅ Al configurar deployment
- ✅ Si commiteaste algo sensible por error
- ✅ Cada 90 días (revisión de secretos)
- ✅ Al onboardear un nuevo desarrollador

**Reglas clave:**
- Secretos NUNCA en código, siempre en `.env`
- `.env` DEBE estar en `.gitignore`
- Service role keys NUNCA con prefijo `VITE_`
- Rotar secretos si fueron expuestos
- Usar `.env.example` para documentar

---

## 🎯 Inicio Rápido

### Para Nuevos Desarrolladores
1. Leer [Diseño del Sistema](./01-system-design.md) completo
2. Leer [Variables de Entorno](./04-environment-secrets.md)
3. Configurar `.env` basado en `.env.example`
4. Revisar [Seguridad](./03-security-best-practices.md) - checklist

### Para Agregar Features
1. Consultar [Diseño del Sistema](./01-system-design.md) - dónde poner código
2. Si toca DB → [Seguridad](./03-security-best-practices.md) - RLS
3. Si comparte código → [Monorepo](./02-monorepo-architecture.md) - packages

### Para Code Review
1. Verificar cumplimiento de [Diseño del Sistema](./01-system-design.md)
2. Verificar [Seguridad](./03-security-best-practices.md) - RLS, validación
3. Verificar [Secretos](./04-environment-secrets.md) - no expuestos

---

## 📖 Cómo Usar Estas Reglas

### En Desarrollo
- ✅ **Antes** de escribir código, consultar la regla relevante
- ✅ **Durante** code review, referenciar reglas específicas
- ✅ **Al agregar** feature nueva, actualizar reglas si es necesario

### En Code Reviews
Cuando encuentres código que no cumple una regla:

```markdown
❌ Este código no cumple con la regla de RLS

**Regla:** [03-security-best-practices.md](./03-security-best-practices.md#row-level-security-rls---obligatorio)

**Problema:** La tabla `new_table` no tiene RLS habilitado

**Solución:**
\`\`\`sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
  ON new_table FOR SELECT
  USING (user_id = auth.uid());
\`\`\`
```

### Al Actualizar Reglas
1. Discutir cambio con el equipo
2. Actualizar regla correspondiente
3. Actualizar fecha "Última actualización"
4. Notificar al equipo del cambio
5. Commitear con mensaje descriptivo:
   ```bash
   git commit -m "docs: update security rules - add GDPR compliance"
   ```

---

## ⚠️ Excepciones a las Reglas

**REGLA SOBRE REGLAS:** Las reglas pueden tener excepciones, PERO:

1. **Justificación requerida**
   - Documentar por qué la regla no aplica
   - Incluir en comentario del código

2. **Aprobación necesaria**
   - Excepciones de seguridad requieren aprobación de admin
   - Excepciones de arquitectura requieren discusión en equipo

3. **Documentar alternativa**
   - Explicar qué se hace en lugar de seguir la regla
   - Documentar trade-offs

**Ejemplo de excepción válida:**

```typescript
// EXCEPCIÓN A REGLA: No usar 'any'
// JUSTIFICACIÓN: Tipo de third-party library sin types disponibles
// ALTERNATIVA: Validamos en runtime con type guard
// APROBADO POR: @admin - Issue #123
const data: any = await legacyAPI.getData();

if (!isValidLegacyData(data)) {
  throw new Error('Invalid data from legacy API');
}
```

---

## 🔄 Mantenimiento de Reglas

### Revisión Trimestral
- Revisar si reglas siguen siendo relevantes
- Actualizar con nuevos aprendizajes
- Agregar ejemplos de casos reales
- Eliminar reglas obsoletas

### Cuando Agregar Nuevas Reglas
- Problema recurrente en code reviews
- Nueva tecnología adoptada
- Incidente de seguridad aprendido
- Patrón exitoso que queremos estandarizar

### Cuando Modificar Reglas
- Regla causa más problemas que soluciones
- Nueva mejor práctica de la industria
- Cambio en stack tecnológico
- Feedback del equipo

---

## 📊 Métricas de Cumplimiento

**Objetivo:** 100% de cumplimiento en code que llega a `main`

### Indicadores
- ✅ Code reviews mencionan reglas específicas
- ✅ PRs rechazados por no cumplir reglas
- ✅ Zero secretos expuestos
- ✅ Zero tablas sin RLS en producción
- ✅ Zero errores de TypeScript en build

### Red Flags
- 🚩 Múltiples excepciones a la misma regla
- 🚩 Reglas ignoradas en code review
- 🚩 Secretos expuestos repetidamente
- 🚩 Mismos errores de seguridad

---

## 📞 Contacto y Soporte

**¿Duda sobre una regla?**
- Crear issue en GitHub con tag `question`
- Referenciar regla específica
- Proponer alternativa si la tienes

**¿Encontraste error en regla?**
- Crear PR con corrección
- Explicar error y solución
- Agregar ejemplo si ayuda

**¿Propones nueva regla?**
- Crear issue con tag `enhancement`
- Explicar problema que resuelve
- Proponer texto de regla
- Dar ejemplos

---

## 🎓 Recursos Adicionales

### Documentación del Proyecto
- [README.md](../../README.md) - Overview del proyecto
- [ARQUITECTURA.md](../../ARQUITECTURA.md) - Documentación técnica detallada
- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Guía de deployment
- [SCRIPTS_GUIDE.md](../../SCRIPTS_GUIDE.md) - Scripts disponibles

### Referencias Externas
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)

---

**Recuerda:** Estas reglas existen para ayudarnos a construir mejor software, más seguro y mantenible. Si una regla no tiene sentido, discutámosla y mejorémosla juntos.

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0

