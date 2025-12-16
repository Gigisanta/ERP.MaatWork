# Calendario del Equipo

## Descripción

El calendario del equipo es un widget de Google Calendar embebido que aparece en la página `/home` cuando está configurado.

## Configuración

### 1. Preparar Google Calendar

1. Ve a [Google Calendar](https://calendar.google.com)
2. Selecciona el calendario que deseas compartir (o crea uno nuevo)
3. Haz clic en los 3 puntos junto al nombre del calendario → **Configuración y uso compartido**
4. En **Permisos de acceso**, marca **"Hacer público este calendario"**
5. En **Integrar calendario**, copia la URL que comienza con:
   ```
   https://calendar.google.com/calendar/embed?src=...
   ```

### 2. Configurar en la Base de Datos

Actualizar el `calendarUrl` del equipo en la base de datos:

```sql
-- Ver equipos existentes
SELECT id, name, calendar_url FROM teams;

-- Actualizar URL del calendario para un equipo
UPDATE teams
SET calendar_url = 'https://calendar.google.com/calendar/embed?src=CALENDAR_ID&mode=week'
WHERE id = 'TEAM_ID_AQUI';
```

### 3. Configurar desde la Interfaz (Próximamente)

En una futura versión, los managers podrán configurar el calendario desde:
- Página de equipo `/teams/[id]`
- Configuración del perfil `/profile`

## Funcionamiento

### Dónde Aparece

El calendario aparece en:
- **Página principal** (`/home`) - Para todos los usuarios autenticados
- Se muestra el calendario del primer equipo que tenga `calendarUrl` configurado

### Vista del Calendario

- **Vista por defecto**: Semanal (`mode=week`)
- **Altura**: 400px
- **Responsive**: Se adapta al ancho del contenedor
- **Loading**: Muestra skeleton animado mientras carga

### Código Relevante

```typescript
// apps/web/app/home/page.tsx (líneas 75-79)
if (teamsResponse.success && teamsResponse.data) {
  const teamWithCalendar = teamsResponse.data.find((team) => team.calendarUrl);
  teamCalendarUrl = teamWithCalendar?.calendarUrl || null;
}

// apps/web/app/components/home/HomePageClient.tsx (líneas 63-67)
{teamCalendarUrl && (
  <section aria-label="Calendario del equipo">
    <CalendarWidget calendarUrl={teamCalendarUrl} />
  </section>
)}
```

## Manejo de Errores

El componente `CalendarWidget` maneja automáticamente:

### Error 403 - Calendario Privado

**Mensaje**:
```
Error 403: El calendario no está configurado como público o la URL no es correcta.
```

**Solución**:
1. Verificar que el calendario esté marcado como público en Google Calendar
2. Usar la URL de embed (formato `https://calendar.google.com/calendar/embed?src=...`)
3. Si el problema persiste, regenerar la URL de embed

### Error de Carga

**Mensaje**:
```
No se pudo cargar el calendario. Verifica que la URL sea correcta y que el calendario esté compartido públicamente.
```

**Solución**:
1. Verificar que la URL esté correcta en la base de datos
2. Comprobar que el calendario siga siendo público
3. Intentar abrir la URL directamente en el navegador

## Normalización de URLs

El widget normaliza automáticamente diferentes formatos de URL:

| Formato de entrada | Formato de salida |
|-------------------|-------------------|
| `?cid=EMAIL@group.calendar.google.com` | `?src=EMAIL@group.calendar.google.com&mode=week` |
| `/embed?src=...` | `/embed?src=...&mode=week` (agrega vista semanal) |
| URLs inválidas | Muestra error |

## Testing

### Verificar que el Calendario Aparece

```bash
# 1. Iniciar servidor de desarrollo
pnpm dev

# 2. Abrir navegador en http://localhost:3000/home
# 3. Verificar que aparece sección "Calendario del Equipo"
```

### Verificar Datos en BD

```sql
-- Ver equipos con calendario configurado
SELECT 
  t.id,
  t.name,
  t.calendar_url,
  COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_membership tm ON t.team_id = tm.team_id
WHERE t.calendar_url IS NOT NULL
GROUP BY t.id, t.name, t.calendar_url;
```

## Limitaciones Conocidas

1. **Solo el primer equipo**: Si un usuario pertenece a múltiples equipos con calendario, solo se muestra el del primer equipo encontrado
2. **No hay selección manual**: El usuario no puede elegir qué calendario ver (próxima versión)
3. **Solo Google Calendar**: No soporta otros proveedores de calendario

## Roadmap

- [ ] Selector de calendario cuando hay múltiples equipos
- [ ] Configuración desde UI (sin SQL manual)
- [ ] Soporte para Outlook Calendar
- [ ] Vista de múltiples calendarios combinados
- [ ] Sincronización bidireccional con tareas de Cactus CRM

## Referencias

- Componente: `apps/web/app/components/CalendarWidget.tsx`
- Página: `apps/web/app/home/page.tsx`
- Schema BD: `packages/db/src/schema/users.ts` (tabla `teams`)
- API: `apps/api/src/routes/teams/handlers/list.ts`

