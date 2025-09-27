# Guía de Usuario - Sistema CRM Integrado con Notion

## Introducción

Bienvenido al Sistema CRM Integrado con Notion. Esta guía te ayudará a configurar y utilizar el sistema para gestionar tus datos de CRM directamente desde Notion.

## Primeros Pasos

### 1. Acceso al Sistema

1. Abre tu navegador y navega a la aplicación
2. Inicia sesión con tu cuenta
3. Ve a la sección "Notion CRM" en el menú principal

### 2. Conectar tu Workspace de Notion

1. **Hacer clic en "Conectar con Notion"**
   - Se abrirá una nueva ventana de Notion
   - Inicia sesión en tu cuenta de Notion si no lo has hecho

2. **Autorizar la aplicación**
   - Selecciona el workspace que deseas conectar
   - Revisa los permisos solicitados
   - Haz clic en "Permitir acceso"

3. **Confirmación**
   - Serás redirigido de vuelta a la aplicación
   - Verás un mensaje de confirmación de conexión exitosa

## Configuración del Sistema

### Configuración Básica

#### 1. URL de Notion Principal
- **Qué es:** La URL principal de tu workspace de Notion
- **Cómo configurar:** Se configura automáticamente al conectar tu workspace
- **Ejemplo:** `https://miempresa.notion.site/`

#### 2. URL de Fallback
- **Qué es:** Una página de Notion que se usa como respaldo
- **Cuándo se usa:** Cuando la URL principal no está disponible
- **Cómo configurar:** 
  1. Ve a Configuración → Notion CRM
  2. Ingresa la URL de tu página de respaldo
  3. Guarda los cambios

### Configuración Avanzada

#### Permisos de Base de Datos
1. En Notion, ve a tu base de datos de CRM
2. Haz clic en "Compartir" en la esquina superior derecha
3. Busca la integración de tu aplicación
4. Asegúrate de que tenga permisos de "Editar"

#### Sincronización
- **Automática:** Los datos se sincronizan cada 5 minutos
- **Manual:** Usa el botón "Sincronizar ahora" cuando necesites

## Uso del CRM

### Dashboard Principal

Al acceder al Notion CRM verás:

1. **Panel de Estado**
   - Estado de conexión con Notion
   - Última sincronización
   - Número de registros

2. **Acciones Rápidas**
   - Sincronizar datos
   - Ver en Notion
   - Configurar workspace

3. **Vista de Datos**
   - Datos directamente desde tu base de datos de Notion
   - Filtros y búsqueda
   - Opciones de edición

### Gestión de Datos

#### Ver Datos
- Los datos se muestran en tiempo real desde Notion
- Usa los filtros para encontrar información específica
- Haz clic en cualquier registro para ver detalles

#### Editar Datos
1. **Edición Directa:**
   - Haz clic en "Editar en Notion"
   - Se abrirá la página correspondiente en Notion
   - Los cambios se reflejarán automáticamente

2. **Edición en la Aplicación:**
   - Haz clic en el icono de edición
   - Modifica los campos necesarios
   - Guarda los cambios

#### Agregar Nuevos Registros
1. Haz clic en "Nuevo Registro"
2. Completa los campos requeridos
3. Guarda el registro
4. El nuevo registro aparecerá en Notion automáticamente

## Migración de Datos

### ¿Cuándo Migrar?
- Cuando tengas datos existentes en Supabase
- Al cambiar de un sistema CRM tradicional a Notion
- Para consolidar datos de múltiples fuentes

### Proceso de Migración

#### 1. Preparación
1. **Respalda tus datos actuales**
   - Exporta datos de Supabase
   - Guarda una copia de seguridad

2. **Prepara tu base de datos de Notion**
   - Crea las columnas necesarias
   - Configura los tipos de datos correctos

#### 2. Iniciar Migración
1. Ve a "Configuración" → "Migración"
2. Selecciona las tablas a migrar
3. Mapea los campos entre Supabase y Notion
4. Haz clic en "Iniciar Migración"

#### 3. Monitoreo
- Observa el progreso en tiempo real
- Revisa los logs de migración
- Verifica que no haya errores

#### 4. Verificación
1. Revisa los datos migrados en Notion
2. Compara con los datos originales
3. Ejecuta pruebas de funcionalidad

### Rollback (Reversión)
Si algo sale mal durante la migración:
1. Ve a "Configuración" → "Migración"
2. Haz clic en "Revertir Última Migración"
3. Confirma la acción
4. Los datos volverán al estado anterior

## Solución de Problemas

### Problemas de Conexión

#### "No se puede conectar con Notion"
**Posibles causas:**
- Token de acceso expirado
- Permisos insuficientes
- Workspace desactivado

**Soluciones:**
1. Desconectar y volver a conectar el workspace
2. Verificar permisos en Notion
3. Contactar al administrador del workspace

#### "Error de sincronización"
**Posibles causas:**
- Conexión a internet inestable
- Base de datos de Notion no accesible
- Límites de API excedidos

**Soluciones:**
1. Verificar conexión a internet
2. Intentar sincronización manual
3. Esperar unos minutos y reintentar

### Problemas de Datos

#### "Los datos no se actualizan"
1. Forzar sincronización manual
2. Verificar permisos de la base de datos
3. Revisar logs de error

#### "Faltan registros después de la migración"
1. Revisar logs de migración
2. Verificar filtros aplicados
3. Comprobar mapeo de campos

### Problemas de Rendimiento

#### "La aplicación está lenta"
1. Verificar conexión a internet
2. Reducir número de registros mostrados
3. Usar filtros para limitar datos

## Mejores Prácticas

### Organización en Notion
1. **Estructura clara:**
   - Usa nombres descriptivos para bases de datos
   - Organiza las propiedades lógicamente
   - Mantén consistencia en tipos de datos

2. **Permisos:**
   - Otorga solo los permisos necesarios
   - Revisa permisos regularmente
   - Documenta cambios de permisos

### Gestión de Datos
1. **Respaldos regulares:**
   - Exporta datos semanalmente
   - Mantén copias en múltiples ubicaciones
   - Prueba la restauración periódicamente

2. **Validación de datos:**
   - Revisa datos después de migraciones
   - Usa validaciones en Notion cuando sea posible
   - Mantén datos limpios y consistentes

### Seguridad
1. **Acceso:**
   - Usa autenticación de dos factores
   - No compartas credenciales
   - Revisa accesos regularmente

2. **Datos sensibles:**
   - Clasifica información confidencial
   - Usa permisos restrictivos
   - Audita accesos a datos sensibles

## Soporte y Recursos

### Documentación Adicional
- [Documentación técnica completa](./NOTION_CRM_IMPLEMENTATION.md)
- [API de Notion](https://developers.notion.com/)
- [Guías de Supabase](https://supabase.com/docs)

### Contacto de Soporte
- **Email:** soporte@tuempresa.com
- **Chat:** Disponible en la aplicación
- **Documentación:** [Wiki interno](./wiki)

### Recursos de la Comunidad
- **Foro de usuarios:** [Enlace al foro]
- **Tutoriales en video:** [Canal de YouTube]
- **Ejemplos de uso:** [Repositorio de ejemplos]

## Actualizaciones y Changelog

### Versión Actual: 1.0.0
- ✅ Integración completa con Notion API
- ✅ Sistema de migración desde Supabase
- ✅ OAuth 2.0 con Notion
- ✅ Sincronización automática
- ✅ Manejo de errores robusto

### Próximas Funcionalidades
- 🔄 Cache Redis para mejor rendimiento
- 📊 Dashboard de analytics
- 🔔 Notificaciones en tiempo real
- 📱 Aplicación móvil

---

**¿Necesitas ayuda?** No dudes en contactar a nuestro equipo de soporte. Estamos aquí para ayudarte a aprovechar al máximo tu CRM integrado con Notion.