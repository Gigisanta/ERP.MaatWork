#!/bin/bash
# Script de limpieza para resolver cache corrupto de Next.js
# AI_DECISION: Limpieza automática de artifacts de cache que generan errores
# Justificación: Errores "next-flight-client-entry-loader" se deben a cache desincronizado en monorepo con pnpm workspaces
# Impacto: Resuelve errores de compilación en desarrollo

echo "🧹 Limpiando cache de Next.js..."

# Matar procesos de Next.js y TSX que puedan estar corriendo
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true

# Esperar un momento para que los procesos terminen
sleep 0.5

# Eliminar .next y artifacts de build
rm -rf .next
rm -rf tsconfig.tsbuildinfo

# Limpiar cache de node_modules/.cache (si existe)
rm -rf node_modules/.cache

# Limpiar cache de turbo
rm -rf ../../.turbo

echo "✅ Limpieza completada"

