# Bundle Size Limits

Este documento define los límites de tamaño de bundle para la aplicación web y cómo verificarlos.

## Límites Establecidos

### First Load JS
- **Límite:** 300KB
- **Descripción:** Tamaño total del JavaScript inicial que se carga en la primera carga de la página
- **Impacto:** Afecta directamente el tiempo de carga inicial (FCP, LCP)

### Individual Chunks
- **Límite:** 200KB por chunk
- **Descripción:** Tamaño máximo permitido para cada chunk individual de JavaScript
- **Impacto:** Afecta el tiempo de carga de rutas específicas

### Total Bundle Size
- **Límite:** 1MB
- **Descripción:** Tamaño total de todos los chunks de JavaScript
- **Impacto:** Afecta el tamaño total de la aplicación

## Verificación

### Verificar Bundle Size

```bash
# Build la aplicación primero
pnpm -F @cactus/web build

# Verificar tamaños
pnpm -F @cactus/web check:bundle
```

### Análisis Detallado

Para un análisis visual detallado del bundle:

```bash
pnpm -F @cactus/web analyze
```

Esto genera un reporte visual en `.next/analyze/` que muestra:
- Tamaño de cada chunk
- Dependencias incluidas
- Oportunidades de optimización

## Ajustar Límites

Los límites pueden ajustarse mediante variables de entorno:

```bash
# Ajustar límite de First Load JS a 350KB
BUNDLE_SIZE_LIMIT_FIRST_LOAD_JS=350 pnpm -F @cactus/web check:bundle

# Ajustar límite de chunks a 250KB
BUNDLE_SIZE_LIMIT_CHUNK=250 pnpm -F @cactus/web check:bundle

# Ajustar límite total a 1.5MB
BUNDLE_SIZE_LIMIT_TOTAL=1500 pnpm -F @cactus/web check:bundle
```

## Estrategias de Optimización

Si los límites se exceden, considerar:

1. **Code Splitting**
   - Usar `dynamic()` para lazy loading de componentes pesados
   - Separar rutas en chunks independientes

2. **Tree Shaking**
   - Importar solo lo necesario de librerías grandes
   - Evitar `import *` de módulos grandes

3. **Server Components**
   - Convertir páginas de solo lectura a Server Components
   - Reducir JavaScript del cliente

4. **Optimización de Dependencias**
   - Revisar dependencias grandes
   - Considerar alternativas más ligeras

5. **Memoización**
   - Usar `React.memo` para componentes de listas
   - Reducir re-renders innecesarios

## CI/CD Integration

El script `check:bundle` puede integrarse en CI/CD para prevenir regresiones:

```yaml
# Ejemplo para GitHub Actions
- name: Check Bundle Size
  run: |
    pnpm -F @cactus/web build
    pnpm -F @cactus/web check:bundle
```

## Métricas Actuales

Última verificación: Pendiente (requiere build exitoso)

**Nota:** Las métricas se generarán automáticamente después de ejecutar `pnpm -F @cactus/web build && pnpm -F @cactus/web check:bundle`. El reporte se guardará en `.next/bundle-report.json`.

- First Load JS: Pendiente de verificación
- Total Bundle: Pendiente de verificación
- Chunks: Pendiente de verificación

**Para obtener métricas actuales:**
```bash
# 1. Build de producción
pnpm -F @cactus/web build

# 2. Verificar bundle size (genera reporte JSON)
pnpm -F @cactus/web check:bundle

# 3. Revisar reporte generado
cat apps/web/.next/bundle-report.json
```

## Referencias

- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

