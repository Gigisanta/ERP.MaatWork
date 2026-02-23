#!/bin/bash
set -e

echo "========================================="
echo "  MAATWORK API - Start with Migrations"
echo "========================================="
echo ""

# AI_DECISION: Script de inicio alternativo para ejecutar migraciones
# Justificación: Si preDeployCommand no funciona, este script asegura migraciones antes del inicio
# Impacto: Migraciones siempre ejecutadas antes que arranque el servidor
# Referencias: Backup para deployment - preDeployCommand en railway.toml es preferido

# Ejecutar migraciones de base de datos
echo "🔄 Ejecutando migraciones..."
cd ../.. && pnpm --filter @maatwork/db migrate

echo "✅ Migraciones completadas"
echo ""

# Iniciar servidor
echo "🚀 Iniciando servidor API..."
cd apps/api && exec node dist/index.js
