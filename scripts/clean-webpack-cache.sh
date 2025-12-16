#!/bin/bash

# =============================================================================
# Script: clean-webpack-cache.sh
# =============================================================================
# Propósito: Limpiar cachés de webpack y Next.js para resolver errores de
#            resolución de módulos "Cannot read properties of undefined"
#
# Uso:
#   ./scripts/clean-webpack-cache.sh
#
# Cuándo usar:
#   - Después de cambios en @cactus/ui
#   - Cuando aparece error "Cannot read properties of undefined (reading 'call')"
#   - Después de actualizar dependencias
#   - Cuando webpack no detecta cambios en packages del workspace
# =============================================================================

set -e

echo "🧹 Limpiando cachés de webpack y Next.js..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detener servidores de desarrollo
echo -e "${YELLOW}⏸️  Deteniendo servidores de desarrollo...${NC}"
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null || echo "No hay servidores corriendo"

# Limpiar caché de Next.js
echo -e "${YELLOW}🗑️  Limpiando caché de Next.js...${NC}"
rm -rf apps/web/.next
echo -e "${GREEN}✅ Removido apps/web/.next${NC}"

# Limpiar caché de turbo (opcional)
if [ -d "node_modules/.cache" ]; then
  echo -e "${YELLOW}🗑️  Limpiando caché de turbo...${NC}"
  rm -rf node_modules/.cache
  echo -e "${GREEN}✅ Removido node_modules/.cache${NC}"
fi

# Reconstruir @cactus/ui
echo -e "${YELLOW}🔨 Reconstruyendo @cactus/ui...${NC}"
pnpm -F @cactus/ui build > /dev/null 2>&1
echo -e "${GREEN}✅ @cactus/ui reconstruido${NC}"

# Verificar que el build fue exitoso
if [ -f "packages/ui/dist/index.js" ]; then
  SIZE=$(ls -lh packages/ui/dist/index.js | awk '{print $5}')
  echo -e "${GREEN}✅ Build verificado: dist/index.js (${SIZE})${NC}"
else
  echo -e "${RED}❌ Error: Build de @cactus/ui falló${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Cachés limpiados exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Puedes reiniciar el servidor de desarrollo con:"
echo "  pnpm dev"
echo ""

