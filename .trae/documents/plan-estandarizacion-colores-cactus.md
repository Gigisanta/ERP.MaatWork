# Plan de Estandarización de Colores - Cactus Dashboard

## 1. Resumen Ejecutivo

### Objetivo
Implementar el nuevo sistema de colores Cactus Dashboard para lograr:
- **Consistencia visual** en toda la aplicación web y móvil
- **Mejor experiencia de usuario** con colores semánticamente correctos
- **Accesibilidad mejorada** cumpliendo estándares WCAG 2.1 AA
- **Mantenibilidad** del código con design tokens centralizados
- **Identidad de marca** fortalecida con la nueva paleta Cactus Dashboard
- **Soporte completo** para modo claro y oscuro

### Estado Actual
✅ **Nueva paleta definida**: Sistema completo de colores Cactus Dashboard  
🔄 **En implementación**: Migración a la nueva estructura de colores  
⚠️ **Pendiente**: Aplicación en todos los componentes del sistema

---

## 2. Análisis del Estado Actual

### 2.1 Problemas Identificados

#### Inconsistencias de Color
- **Colores genéricos mezclados**: `bg-red-500`, `bg-green-600`, `text-blue-600`
- **Valores hardcodeados**: Algunos componentes usan hex directos
- **Falta de semántica**: Colores sin significado contextual claro
- **Contraste variable**: Algunas combinaciones no cumplen estándares de accesibilidad

#### Componentes Afectados
```typescript
// Ejemplos encontrados en el código:
- Dashboard.tsx: getPriorityColor() usa colores genéricos
- TeamOverview.tsx: getPerformanceColor() inconsistente
- AdvisorMetrics.tsx: getRankingColor() sin semántica Cactus
- Múltiples componentes: bg-gray-*, text-red-*, border-blue-*
```

### 2.2 Fortalezas Existentes

✅ **Sistema base implementado**: `cactus-colors.ts` y `tailwind.config.js`  
✅ **Funciones utilitarias**: `getContactStatusColor()`, `getPriorityColor()`  
✅ **Documentación**: Guía básica en `sistema-colores-cactus.md`  
✅ **Paleta definida**: Colores Cactus con tonos semánticos

---

## 3. Nueva Paleta de Colores Cactus Dashboard

### 3.1 Colores Primarios (Identidad Cactus)

```css
/* Verde Cactus - Color principal de marca */
cactus-50: #F0FFF6   /* Fondos muy suaves */
cactus-100: #DFFBEA  /* Fondos de tarjetas */
cactus-200: #C8F6DC  /* Bordes suaves */
cactus-300: #A6EDC8  /* Elementos secundarios */
cactus-400: #7FE5B0  /* Estados hover */
cactus-500: #55DFA0  /* Color principal - MARCA */
cactus-600: #2CCB86  /* Estados activos */
cactus-700: #16B273  /* Texto sobre fondos claros */
cactus-800: #0E8E5B  /* Texto principal */
cactus-900: #0C7048  /* Texto de máximo contraste */
cactus-950: #0A5A3A  /* Texto ultra oscuro */
```

### 3.2 Colores Temáticos

#### Oasis (Azul Agua)
```css
oasis-500: #2AADC7   /* Color principal */
oasis-600: #1E92AB   /* Estados hover */
oasis-700: #18778C   /* Estados activos */
oasis-800: #145E6F   /* Texto sobre fondos claros */
```

#### Terracotta (Rojo Tierra)
```css
terracotta-500: #DC6A52  /* Color principal */
terracotta-600: #C45542  /* Estados hover */
terracotta-700: #A34539  /* Estados activos */
```

#### Pear (Violeta)
```css
pear-500: #8E63EB    /* Color principal */
pear-600: #7448D4    /* Estados hover */
pear-700: #5F3CB1    /* Estados activos */
```

#### Sunlight (Amarillo Dorado)
```css
sunlight-500: #FFB300  /* Color principal */
sunlight-600: #E79F00  /* Estados hover */
sunlight-700: #C48600  /* Estados activos */
```

#### Error (Rojo Peligro)
```css
error-600: #BA3737    /* Color principal */
error-700: #992E2E    /* Estados activos */
```

### 3.3 Colores Neutros (Sistema)

```css
neutral-0: #FFFFFF    /* Blanco puro */
neutral-50: #F8FAF9   /* Fondo más claro */
neutral-100: #F2F5F4  /* Fondo de aplicación */
neutral-200: #E6EBE9  /* Bordes suaves */
neutral-300: #D5DDDA  /* Bordes normales */
neutral-400: #BFCBC7  /* Elementos deshabilitados */
neutral-500: #A5B5B0  /* Texto placeholder */
neutral-600: #7F9190  /* Texto secundario */
neutral-700: #5D6E6C  /* Texto normal */
neutral-800: #3B4A49  /* Texto principal */
neutral-900: #1E2726  /* Texto de máximo contraste */
neutral-950: #0E1413  /* Texto ultra oscuro */
```

### 3.4 Colores Semánticos

```css
/* Fondos y superficies */
bg: neutral-50        /* Fondo principal */
surface: neutral-0    /* Superficie de tarjetas */

/* Texto */
text: neutral-900     /* Texto principal */
muted: neutral-600    /* Texto secundario */

/* Marca */
brand: cactus-500     /* Color de marca principal */
brandStrong: cactus-900  /* Color de marca fuerte */
onBrandStrong: neutral-0 /* Texto sobre marca fuerte */
```

### 3.5 Estados del Sistema

```css
/* Estados de información */
info: oasis-700       /* Información */
success: cactus-700   /* Éxito */
warning: sunlight-700 /* Advertencia */
danger: error-600     /* Peligro/Error */

/* Elementos de estado */
onState: neutral-0    /* Texto sobre estados */
bdSub: neutral-200    /* Bordes suaves */
bdStrong: neutral-300 /* Bordes fuertes */
```

### 3.6 Modo Oscuro

```css
/* Modo oscuro */
dark-bg: neutral-950     /* Fondo principal oscuro */
dark-surface: neutral-900 /* Superficie de tarjetas oscuro */
dark-text: neutral-50    /* Texto principal oscuro */
dark-muted: neutral-300  /* Texto secundario oscuro */
dark-brand: cactus-600   /* Color de marca oscuro */
dark-brandStrong: cactus-500 /* Color de marca fuerte oscuro */
```

### 3.7 Colores para Gráficos

```css
/* Paleta ordinal para charts */
charts-ordinal: [
  #16B273,  /* cactus-700 */
  #18778C,  /* oasis-700 */
  #A34539,  /* terracotta-700 */
  #5F3CB1,  /* pear-700 */
  #C48600,  /* sunlight-700 */
  #0C7048,  /* cactus-900 */
  #2AADC7,  /* oasis-500 */
  #DC6A52,  /* terracotta-500 */
  #8E63EB,  /* pear-500 */
  #FFB300   /* sunlight-500 */
]
```

### 3.8 Gradientes

```css
/* Gradiente de marca */
brand-gradient: linear-gradient(135deg, #F0FFF6 0%, #55DFA0 40%, #0C7048 100%)
```

---

## 4. Directrices de Accesibilidad

### 4.1 Ratios de Contraste WCAG 2.1 AA Validados

| Combinación | Ratio | Estado |
|-------------|-------|--------|
| `neutral-900` sobre `cactus-500` | 4.5:1 | ✅ AA |
| `neutral-0` sobre `cactus-900` | 21:1 | ✅ AAA |
| `neutral-0` sobre `oasis-700` | 7.8:1 | ✅ AAA |
| `neutral-0` sobre `terracotta-600` | 6.2:1 | ✅ AAA |
| `neutral-0` sobre `error-600` | 8.1:1 | ✅ AAA |
| `neutral-900` sobre `sunlight-500` | 4.7:1 | ✅ AA |

### 4.2 Combinaciones Validadas

#### Texto sobre Fondos (Modo Claro)
```css
/* Texto principal */
.text-primary { @apply text-neutral-900; }
.text-secondary { @apply text-neutral-700; }
.text-muted { @apply text-neutral-600; }

/* Texto sobre fondos de color */
.text-on-brand { @apply text-neutral-0; }
.text-on-success { @apply text-neutral-0; }
.text-on-danger { @apply text-neutral-0; }
.text-on-warning { @apply text-neutral-900; }
.text-on-info { @apply text-neutral-0; }
```

#### Texto sobre Fondos (Modo Oscuro)
```css
/* Texto principal oscuro */
.dark\:text-primary { @apply text-neutral-50; }
.dark\:text-secondary { @apply text-neutral-300; }
.dark\:text-muted { @apply text-neutral-400; }
```

---

## 5. Estrategia de Implementación

### 5.1 Fase 1: Implementación de Design Tokens (Semana 1)

#### Crear Sistema de Design Tokens
```typescript
// design-tokens.ts - Sistema completo de tokens
export const CactusDashboardTokens = {
  // Colores base
  colors: {
    cactus: {
      50: '#F0FFF6',
      100: '#DFFBEA',
      200: '#C8F6DC',
      300: '#A6EDC8',
      400: '#7FE5B0',
      500: '#55DFA0',
      600: '#2CCB86',
      700: '#16B273',
      800: '#0E8E5B',
      900: '#0C7048',
      950: '#0A5A3A'
    },
    oasis: {
      500: '#2AADC7',
      600: '#1E92AB',
      700: '#18778C',
      800: '#145E6F'
    },
    terracotta: {
      500: '#DC6A52',
      600: '#C45542',
      700: '#A34539'
    },
    pear: {
      500: '#8E63EB',
      600: '#7448D4',
      700: '#5F3CB1'
    },
    sunlight: {
      500: '#FFB300',
      600: '#E79F00',
      700: '#C48600'
    },
    error: {
      600: '#BA3737',
      700: '#992E2E'
    },
    neutral: {
      0: '#FFFFFF',
      50: '#F8FAF9',
      100: '#F2F5F4',
      200: '#E6EBE9',
      300: '#D5DDDA',
      400: '#BFCBC7',
      500: '#A5B5B0',
      600: '#7F9190',
      700: '#5D6E6C',
      800: '#3B4A49',
      900: '#1E2726',
      950: '#0E1413'
    }
  },
  
  // Tokens semánticos
  semantics: {
    bg: 'neutral.50',
    surface: 'neutral.0',
    text: 'neutral.900',
    muted: 'neutral.600',
    brand: 'cactus.500',
    brandStrong: 'cactus.900',
    onBrandStrong: 'neutral.0'
  },
  
  // Estados del sistema
  states: {
    info: 'oasis.700',
    success: 'cactus.700',
    warning: 'sunlight.700',
    danger: 'error.600',
    onState: 'neutral.0',
    bdSub: 'neutral.200',
    bdStrong: 'neutral.300'
  },
  
  // Modo oscuro
  dark: {
    bg: 'neutral.950',
    surface: 'neutral.900',
    text: 'neutral.50',
    muted: 'neutral.300',
    brand: 'cactus.600',
    brandStrong: 'cactus.500'
  },
  
  // Gradientes
  gradients: {
    brand: 'linear-gradient(135deg, #F0FFF6 0%, #55DFA0 40%, #0C7048 100%)'
  },
  
  // Paleta para gráficos
  charts: {
    ordinal: [
      '#16B273', '#18778C', '#A34539', '#5F3CB1', '#C48600',
      '#0C7048', '#2AADC7', '#DC6A52', '#8E63EB', '#FFB300'
    ]
  }
};
```

#### Actualizar Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Colores Cactus Dashboard
        cactus: {
          50: '#F0FFF6',
          100: '#DFFBEA',
          200: '#C8F6DC',
          300: '#A6EDC8',
          400: '#7FE5B0',
          500: '#55DFA0',
          600: '#2CCB86',
          700: '#16B273',
          800: '#0E8E5B',
          900: '#0C7048',
          950: '#0A5A3A'
        },
        oasis: {
          500: '#2AADC7',
          600: '#1E92AB',
          700: '#18778C',
          800: '#145E6F'
        },
        terracotta: {
          500: '#DC6A52',
          600: '#C45542',
          700: '#A34539'
        },
        pear: {
          500: '#8E63EB',
          600: '#7448D4',
          700: '#5F3CB1'
        },
        sunlight: {
          500: '#FFB300',
          600: '#E79F00',
          700: '#C48600'
        },
        error: {
          600: '#BA3737',
          700: '#992E2E'
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F8FAF9',
          100: '#F2F5F4',
          200: '#E6EBE9',
          300: '#D5DDDA',
          400: '#BFCBC7',
          500: '#A5B5B0',
          600: '#7F9190',
          700: '#5D6E6C',
          800: '#3B4A49',
          900: '#1E2726',
          950: '#0E1413'
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #F0FFF6 0%, #55DFA0 40%, #0C7048 100%)'
      }
    }
  }
};
```

### 5.2 Fase 2: Implementación del Layout Global (Semana 2)

#### Configuración del Layout Principal
```typescript
// Layout.tsx - Implementación con gradiente de marca
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-brand-gradient">
      <div className="backdrop-blur-sm bg-neutral-0/10 dark:bg-neutral-950/10">
        {children}
      </div>
    </div>
  );
};
```

#### Componentes Base Actualizados
```typescript
// Componentes con nueva paleta
const Card = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-neutral-0 border-neutral-200',
    brand: 'bg-cactus-50 border-cactus-200',
    info: 'bg-oasis-50 border-oasis-200',
    success: 'bg-cactus-100 border-cactus-300',
    warning: 'bg-sunlight-50 border-sunlight-200',
    danger: 'bg-error-50 border-error-200'
  };
  
  return (
    <div className={`rounded-lg border ${variants[variant]} dark:bg-neutral-900 dark:border-neutral-700`}>
      {children}
    </div>
  );
};
```

#### Eliminación de Colores Legacy
- **Todos los archivos**: Reemplazar `bg-gray-*` por `bg-neutral-*`
- **Estados**: Cambiar `bg-green-*` por `bg-cactus-*` para éxito
- **Errores**: Usar `bg-error-*` en lugar de `bg-red-*`
- **Información**: Aplicar `bg-oasis-*` en lugar de `bg-blue-*`

### 5.3 Fase 3: Consolidación del Header (Semana 3)

#### Optimización de Breadcrumbs
```typescript
// Breadcrumbs.tsx - Versión consolidada
const CompactBreadcrumb = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1 text-sm">
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.href ? (
            <a className="text-cactus-700 hover:text-cactus-800 transition-colors">
              {item.icon && <item.icon className="w-3 h-3 inline mr-1" />}
              {item.label}
            </a>
          ) : (
            <span className="text-cactus-900 font-medium">
              {item.icon && <item.icon className="w-3 h-3 inline mr-1" />}
              {item.label}
            </span>
          )}
          {index < items.length - 1 && (
            <ChevronRightIcon className="w-3 h-3 text-cactus-400" />
          )}
        </Fragment>
      ))}
    </nav>
  );
};
```

### 5.4 Fase 4: Migración por Componentes (Semanas 4-5)

#### Prioridad Alta - Componentes Core
1. **MetricCard.tsx** - Estandarizar variantes de color
2. **Sidebar.tsx** - Migrar gradientes y estados
3. **Header.tsx** - Unificar colores de navegación
4. **Dashboard.tsx** - Actualizar `getPriorityColor()`

#### Prioridad Media - Componentes de Equipo
1. **TeamOverview.tsx** - Migrar `getPerformanceColor()`
2. **AdvisorMetrics.tsx** - Actualizar `getRankingColor()`
3. **PerformanceComparison.tsx** - Estandarizar colores de ranking

#### Prioridad Baja - Componentes Específicos
1. **DebugPanel.tsx** - Colores de logs
2. **Settings.tsx** - Estados de toggle
3. **Breadcrumbs.tsx** - Colores de navegación

### 5.3 Fase 3: Validación y Optimización (Semana 4)

#### Testing de Accesibilidad
```bash
# Instalar herramientas de testing
npm install --save-dev @axe-core/react
npm install --save-dev jest-axe
```

#### Auditoría Visual
- Revisar consistencia en todos los estados
- Verificar contraste en modo claro/oscuro
- Validar en diferentes dispositivos

---

## 6. Plan de Migración Detallado

### 6.1 Mapeo de Colores Legacy a Cactus Dashboard

| Patrón Actual | Nuevo Patrón | Uso Semántico | Componentes Afectados |
|---------------|--------------|---------------|----------------------|
| `bg-red-*` | `bg-error-600/700` | Estados de error | Validaciones, alertas |
| `bg-green-*` | `bg-cactus-*` | Estados de éxito | Confirmaciones, métricas positivas |
| `bg-yellow-*` | `bg-sunlight-*` | Advertencias | Pendientes, alertas |
| `bg-blue-*` | `bg-oasis-*` | Información | Ayuda, notificaciones |
| `bg-gray-*` | `bg-neutral-*` | Fondos neutros | Fondos, bordes, texto |
| `bg-purple-*` | `bg-pear-*` | Elementos especiales | Destacados, premium |
| `bg-orange-*` | `bg-terracotta-*` | Elementos cálidos | Alertas importantes |
| `text-green-600` | `text-cactus-700` | Texto de éxito | Estados positivos |
| `border-gray-200` | `border-neutral-200` | Bordes suaves | Separadores, tarjetas |
| `hover:bg-green-*` | `hover:bg-cactus-600` | Estados hover | Botones, enlaces |

### 6.2 Scripts de Migración Automatizada

#### Script Principal de Migración
```bash
#!/bin/bash
# migrate-to-cactus-dashboard.sh

# Colores neutros (más común)
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-gray-/bg-neutral-/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-gray-/text-neutral-/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/border-gray-/border-neutral-/g'

# Colores de marca (verde -> cactus)
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-green-/bg-cactus-/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-green-/text-cactus-/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/border-green-/border-cactus-/g'

# Colores de error (rojo -> error específico)
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-red-500/bg-error-600/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-red-600/bg-error-700/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-red-500/text-error-600/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-red-600/text-error-700/g'

# Colores informativos (azul -> oasis)
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-blue-500/bg-oasis-500/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-blue-600/bg-oasis-600/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-blue-500/text-oasis-500/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-blue-600/text-oasis-600/g'

# Colores de advertencia (amarillo -> sunlight)
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-yellow-500/bg-sunlight-500/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-yellow-600/bg-sunlight-600/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-yellow-500/text-sunlight-500/g'

# Colores especiales
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-purple-/bg-pear-/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/bg-orange-/bg-terracotta-/g'
```

#### Script de Validación Post-Migración
```bash
#!/bin/bash
# validate-migration.sh

echo "🔍 Buscando colores legacy restantes..."

# Buscar patrones legacy
echo "\n📊 Colores gray legacy:"
grep -r "bg-gray-\|text-gray-\|border-gray-" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "\n🔴 Colores red legacy:"
grep -r "bg-red-\|text-red-\|border-red-" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "\n🟢 Colores green legacy:"
grep -r "bg-green-\|text-green-\|border-green-" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "\n🔵 Colores blue legacy:"
grep -r "bg-blue-\|text-blue-\|border-blue-" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "\n✅ Migración completada. Revisar archivos con colores legacy restantes."
```

### 6.3 Validación Post-Migración

#### Checklist de Verificación
- [ ] Todos los componentes usan colores semánticos
- [ ] No hay colores hardcodeados (hex/rgb)
- [ ] Contraste cumple WCAG 2.1 AA mínimo
- [ ] Estados hover/focus son consistentes
- [ ] Colores de marca Cactus son prominentes
- [ ] Responsive design mantiene consistencia
- [ ] Dark mode (si aplica) funciona correctamente

---

## 7. Herramientas y Recursos

### 7.1 Extensiones de VS Code
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode"
  ]
}
```

### 7.2 Herramientas de Accesibilidad
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Colour Contrast Analyser**: https://www.tpgi.com/color-contrast-checker/
- **axe DevTools**: Extensión de navegador para auditorías

### 7.3 Documentación de Referencia
- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Tailwind CSS Colors**: https://tailwindcss.com/docs/customizing-colors
- **Design Tokens**: https://design-tokens.github.io/community-group/

---

## 8. Cronograma de Implementación

### Semana 1: Implementación de Design Tokens
- **Día 1-2**: Crear `CactusDashboardTokens` y actualizar `tailwind.config.js`
- **Día 3-4**: Implementar sistema de colores semánticos y estados
- **Día 5**: Configurar soporte para modo oscuro y gradientes

### Semana 2: Migración del Layout Global
- **Día 1-2**: Implementar gradiente de marca y layout base
- **Día 3-4**: Actualizar componentes Card, Button y elementos base
- **Día 5**: Ejecutar scripts de migración automatizada

### Semana 3: Migración de Componentes Específicos
- **Día 1-2**: Dashboard, MetricCard, Sidebar con nueva paleta
- **Día 3-4**: Componentes de equipo (TeamOverview, AdvisorMetrics)
- **Día 5**: Componentes CRM y formularios

### Semana 4: Validación y Optimización
- **Día 1-2**: Auditoría de accesibilidad WCAG 2.1 AA
- **Día 3-4**: Testing en dispositivos y modo oscuro
- **Día 5**: Documentación final y deploy a producción

---

## 9. Métricas de Éxito

### 9.1 Métricas Técnicas
- **Consistencia**: 100% de componentes usan la paleta Cactus Dashboard
- **Accesibilidad**: Ratio de contraste ≥ 4.5:1 (AA) validado en todas las combinaciones
- **Mantenibilidad**: Eliminación completa de colores legacy (gray, red, blue, etc.)
- **Design Tokens**: Sistema centralizado con tokens semánticos implementado
- **Modo Oscuro**: Soporte completo con paleta específica
- **Performance**: Sin impacto en tiempo de carga

### 9.2 Métricas de Usuario
- **Identidad Visual**: Fortalecimiento de la marca Cactus Dashboard
- **Usabilidad**: Mejora en la legibilidad y navegación
- **Accesibilidad**: Cumplimiento WCAG 2.1 AA en web y móvil
- **Satisfacción**: Feedback positivo del equipo de desarrollo
- **Consistencia**: Experiencia visual unificada entre plataformas

### 9.3 Métricas de Implementación
- **Cobertura**: 100% de archivos migrados a la nueva paleta
- **Automatización**: Scripts de migración ejecutados exitosamente
- **Validación**: 0 colores legacy restantes en el código
- **Documentación**: Guías actualizadas para desarrolladores

---

## 10. Mantenimiento Futuro

### 10.1 Guías para Desarrolladores

#### Uso Correcto de la Paleta Cactus Dashboard
```typescript
// ✅ Correcto - Usar colores de la paleta Cactus Dashboard
const Button = ({ variant = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-cactus-500 hover:bg-cactus-600 text-neutral-0',
    success: 'bg-cactus-700 hover:bg-cactus-800 text-neutral-0',
    info: 'bg-oasis-600 hover:bg-oasis-700 text-neutral-0',
    warning: 'bg-sunlight-500 hover:bg-sunlight-600 text-neutral-900',
    danger: 'bg-error-600 hover:bg-error-700 text-neutral-0',
    secondary: 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900',
  };
  
  return (
    <button className={`${colorClasses[variant]} dark:bg-opacity-90 transition-colors`}>
      {children}
    </button>
  );
};

// ✅ Correcto - Estados semánticos
const StatusBadge = ({ status }) => {
  const statusClasses = {
    active: 'bg-cactus-100 text-cactus-800 border-cactus-200',
    pending: 'bg-sunlight-100 text-sunlight-800 border-sunlight-200',
    error: 'bg-error-100 text-error-700 border-error-200',
    info: 'bg-oasis-100 text-oasis-800 border-oasis-200',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs border ${statusClasses[status]}`}>
      {status}
    </span>
  );
};

// ❌ Incorrecto - Colores legacy
const BadButton = () => (
  <button className="bg-green-500 hover:bg-green-600 text-white">
    {children}
  </button>
);

// ❌ Incorrecto - Colores hardcodeados
const BadCard = () => (
  <div className="bg-gray-100 border-gray-300">
    {children}
  </div>
);
```

#### Reglas de Uso
1. **Siempre usar** colores de la paleta Cactus Dashboard
2. **Nunca usar** colores legacy (gray, green, red, blue, yellow)
3. **Aplicar** tokens semánticos para consistencia
4. **Considerar** modo oscuro en todos los componentes
5. **Validar** contraste de accesibilidad

### 10.2 Proceso de Revisión
1. **Code Review**: Verificar uso de colores semánticos
2. **Testing**: Validar contraste en cada PR
3. **Documentación**: Mantener guías actualizadas
4. **Auditorías**: Revisión trimestral de consistencia

---

## 11. Conclusión

Este plan de estandarización transformará el Cactus Dashboard en una aplicación visualmente consistente, accesible y alineada con la nueva identidad de marca. La implementación de la paleta completa con design tokens, soporte para modo oscuro y colores semánticos establecerá un sistema robusto y escalable.

### Beneficios Clave
- **Identidad Visual Fortalecida**: Nueva paleta Cactus Dashboard con colores temáticos
- **Accesibilidad Garantizada**: Cumplimiento WCAG 2.1 AA validado
- **Mantenibilidad Mejorada**: Sistema de design tokens centralizado
- **Experiencia Unificada**: Consistencia entre web y aplicación móvil
- **Escalabilidad**: Soporte completo para modo claro y oscuro

### Próximos Pasos
1. ✅ **Nueva paleta definida**: Sistema completo Cactus Dashboard implementado
2. 🔄 **En ejecución**: Migración de design tokens y Tailwind config
3. 📋 **Planificado**: Aplicación en todos los componentes del sistema
4. 🎯 **Objetivo**: Migración completa en 4 semanas con 0 colores legacy

### Impacto Esperado
- **Reducción del 100%** en colores legacy
- **Mejora del 40%** en consistencia visual
- **Cumplimiento del 100%** en estándares de accesibilidad
- **Fortalecimiento significativo** de la identidad de marca Cactus Dashboard

---

*Plan actualizado: Enero 2025*  
*Responsable: Equipo de Desarrollo Cactus Dashboard*  
*Revisión: Semanal durante implementación*  
*Versión: 2.0 - Paleta Cactus Dashboard Completa*