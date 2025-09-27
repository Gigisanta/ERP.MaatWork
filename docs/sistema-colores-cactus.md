# Sistema de Colores Cactus - Guía de Implementación

## Introducción

Este documento describe el sistema de colores centralizado basado en la identidad visual de Cactus. El objetivo es mantener consistencia visual en toda la aplicación y mejorar la experiencia del usuario.

## Paleta de Colores Principal

### Colores Cactus (Primarios)
```css
cactus-50: #f7f5f0   /* Fondo muy claro */
cactus-100: #ede8d9  /* Fondo claro */
cactus-200: #ddd1b3  /* Bordes suaves */
cactus-300: #c8b584  /* Elementos secundarios */
cactus-400: #b59a5e  /* Elementos activos */
cactus-500: #a68547  /* Color principal */
cactus-600: #8f6f3c  /* Hover states */
cactus-700: #775a32  /* Texto sobre fondos claros */
cactus-800: #644a2d  /* Texto principal */
cactus-900: #553f29  /* Texto muy oscuro */
```

### Estados Semánticos

#### Éxito (Verde Cactus)
```css
success-50: #f0f9f0   /* Fondos de éxito muy suaves */
success-100: #dcf2dc  /* Notificaciones de éxito */
success-200: #bce5bc  /* Bordes de éxito */
success-300: #8fd18f  /* Elementos de éxito secundarios */
success-400: #5cb85c  /* Botones de éxito */
success-500: #3d8b3d  /* Color principal de éxito */
```

#### Advertencia (Amarillo Cactus)
```css
warning-50: #fffbeb   /* Fondos de advertencia muy suaves */
warning-100: #fef3c7  /* Notificaciones de advertencia */
warning-200: #fde68a  /* Bordes de advertencia */
warning-300: #fcd34d  /* Elementos de advertencia secundarios */
warning-400: #fbbf24  /* Botones de advertencia */
warning-500: #f59e0b  /* Color principal de advertencia */
```

#### Error (Terracota)
```css
error-50: #fef2f2     /* Fondos de error muy suaves */
error-100: #fee2e2    /* Notificaciones de error */
error-200: #fecaca    /* Bordes de error */
error-300: #fca5a5    /* Elementos de error secundarios */
error-400: #f87171    /* Botones de error */
error-500: #dc6545    /* Color principal de error */
```

#### Información (Azul Desierto)
```css
info-50: #eff6ff      /* Fondos informativos muy suaves */
info-100: #dbeafe     /* Notificaciones informativas */
info-200: #bfdbfe     /* Bordes informativos */
info-300: #93c5fd     /* Elementos informativos secundarios */
info-400: #60a5fa     /* Botones informativos */
info-500: #3b82f6     /* Color principal informativo */
```

### Colores Neutros (Tonos Arena)
```css
neutral-50: #fafaf9   /* Fondo más claro */
neutral-100: #f5f5f4  /* Fondo claro */
neutral-200: #e7e5e4  /* Bordes suaves */
neutral-300: #d6d3d1  /* Bordes */
neutral-400: #a8a29e  /* Texto placeholder */
neutral-500: #78716c  /* Texto secundario */
neutral-600: #57534e  /* Texto */
neutral-700: #44403c  /* Texto principal */
neutral-800: #292524  /* Texto muy oscuro */
neutral-900: #1c1917  /* Texto máximo contraste */
```

## Uso en Componentes

### Estados de Contactos CRM

```typescript
// Reemplazar colores genéricos por colores Cactus

// ❌ Antes (colores genéricos)
case 'Prospecto': return 'bg-gray-100 text-gray-800';
case 'Cliente': return 'bg-green-100 text-green-800';

// ✅ Después (colores Cactus)
case 'Prospecto': return 'bg-cactus-100 text-cactus-800';
case 'Cliente': return 'bg-success-400 text-white';
```

### Estados de Tareas

```typescript
// ❌ Antes
case 'high': return 'bg-red-400';
case 'medium': return 'bg-yellow-400';
case 'low': return 'bg-green-400';

// ✅ Después
case 'high': return 'bg-error-400';
case 'medium': return 'bg-warning-400';
case 'low': return 'bg-success-400';
```

### Botones y Elementos Interactivos

```typescript
// ❌ Antes
className="bg-green-600 hover:bg-green-700 text-white"

// ✅ Después
className="bg-success-500 hover:bg-success-600 text-white"
```

## Implementación con el Sistema Centralizado

### Importar el Sistema de Colores

```typescript
import { 
  CactusColors, 
  StatusColors, 
  getContactStatusColor, 
  getPriorityColor,
  getTaskStatusColor 
} from '@/styles/cactus-colors';
```

### Ejemplos de Uso

```typescript
// Obtener colores de estado de contacto
const contactColors = getContactStatusColor('Prospecto');
// Resultado: { bg: '#ede8d9', text: '#1c1917' }

// Obtener color de prioridad
const priorityColor = getPriorityColor('high');
// Resultado: '#f87171'

// Obtener colores de estado de tarea
const taskColors = getTaskStatusColor('completed');
// Resultado: { bg: '#dcf2dc', text: '#1c1917' }
```

## Migración de Colores Existentes

### Mapeo de Colores Legacy

| Color Anterior | Color Nuevo | Uso Recomendado |
|----------------|-------------|------------------|
| `bg-red-*` | `bg-error-*` | Estados de error |
| `bg-green-*` | `bg-success-*` | Estados de éxito |
| `bg-yellow-*` | `bg-warning-*` | Estados de advertencia |
| `bg-blue-*` | `bg-info-*` | Estados informativos |
| `bg-gray-*` | `bg-neutral-*` | Elementos neutros |
| `text-red-*` | `text-error-*` | Texto de error |
| `text-green-*` | `text-success-*` | Texto de éxito |

## Buenas Prácticas

### ✅ Hacer

1. **Usar colores semánticos**: Preferir `bg-success-100` sobre `bg-green-100`
2. **Mantener contraste**: Asegurar legibilidad con combinaciones apropiadas
3. **Consistencia**: Usar el mismo color para el mismo tipo de estado en toda la app
4. **Accesibilidad**: Verificar que los colores cumplan con WCAG 2.1

### ❌ Evitar

1. **Colores hardcodeados**: No usar valores hex directamente en componentes
2. **Colores genéricos**: Evitar `bg-red-500` cuando se puede usar `bg-error-500`
3. **Inconsistencias**: No mezclar diferentes tonos para el mismo estado
4. **Bajo contraste**: Evitar combinaciones que dificulten la lectura

## Herramientas de Desarrollo

### Extensión de VS Code
Instalar "Tailwind CSS IntelliSense" para autocompletado de clases.

### Verificación de Contraste
Usar herramientas como WebAIM Contrast Checker para verificar accesibilidad.

## Checklist de Migración

- [ ] Reemplazar `bg-red-*` por `bg-error-*`
- [ ] Reemplazar `bg-green-*` por `bg-success-*`
- [ ] Reemplazar `bg-yellow-*` por `bg-warning-*`
- [ ] Reemplazar `bg-blue-*` por `bg-info-*`
- [ ] Reemplazar `bg-gray-*` por `bg-neutral-*`
- [ ] Actualizar estados de contactos CRM
- [ ] Actualizar estados de tareas
- [ ] Actualizar botones y elementos interactivos
- [ ] Verificar contraste y accesibilidad
- [ ] Probar en diferentes dispositivos

## Contacto

Para dudas sobre el sistema de colores, contactar al equipo de desarrollo.

---

*Última actualización: Enero 2025*
*Versión: 1.0*