# Templates

Templates para crear nuevos archivos con estructura estandar.

## Uso

1. Copiar el template a la ubicacion deseada
2. Reemplazar los placeholders (`[Domain]`, `[domain]`, `[endpoint]`, etc.)
3. Ajustar tipos, campos y logica segun el dominio

## Templates Disponibles

### api-client-template.ts

Template para crear archivos de API client en el frontend.

**Ubicacion destino:** `apps/web/lib/api/[domain].ts`

**Placeholders:**
- `[Domain]` - Nombre del dominio en PascalCase (ej: Contact, Task)
- `[domain]` - Nombre del dominio en minusculas (ej: contact, task)
- `[endpoint]` - Ruta de la API (ej: contacts, tasks)

**Ejemplo:**
```bash
# Copiar template
cp .templates/api-client-template.ts apps/web/lib/api/projects.ts

# Reemplazar placeholders
# [Domain] -> Project
# [domain] -> project
# [endpoint] -> projects
```

### route-handler-template.ts

Template para crear handlers de rutas en el backend.

**Ubicacion destino:** `apps/api/src/routes/[domain]/handlers/[action].ts`

**Placeholders:**
- `[Domain]` - Nombre del dominio en PascalCase (ej: Contact, Task)
- `[domain]` - Nombre del dominio en minusculas (ej: contact, task)

**Ejemplo:**
```bash
# Copiar template
cp .templates/route-handler-template.ts apps/api/src/routes/projects/handlers/crud.ts

# Reemplazar placeholders
# [Domain] -> Project
# [domain] -> project
```

## Estructura de Templates

Cada template incluye:
- Comentarios explicativos en el header
- Secciones claramente separadas
- Tipos e interfaces necesarios
- JSDoc para funciones
- Ejemplos de uso

## Referencias

- [FILE-STRUCTURE.md](../docs/FILE-STRUCTURE.md) - Estructura de archivos
- [CODE-IMPROVEMENTS.md](../docs/CODE-IMPROVEMENTS.md) - Patrones de codigo
- [00-core.mdc](../.cursor/rules/00-core.mdc) - Reglas del proyecto
