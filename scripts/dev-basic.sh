#!/bin/bash

# Script de desarrollo para Cactus CRM
# Ejecuta la API y Web App por separado para mejor control de logs

echo "🚀 Iniciando Cactus CRM en modo desarrollo..."
echo ""

# Arranque limpio: limpiar puertos y procesos comunes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_ROOT/scripts/dev-clean.sh" ]; then
    bash "$PROJECT_ROOT/scripts/dev-clean.sh" || true
fi

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo aplicaciones..."
    pkill -f "tsx watch src/index.ts" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    echo "✅ Aplicaciones detenidas"
    exit 0
}

# Capturar Ctrl+C para limpiar procesos
trap cleanup SIGINT

# Iniciar API en background
echo "🔧 Iniciando API en puerto 3001..."
cd apps/api
pnpm dev &
API_PID=$!
cd ../..

# Esperar un poco para que la API se inicie
sleep 3

# Verificar que la API esté funcionando
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API funcionando en http://localhost:3001"
else
    echo "❌ Error: API no se pudo iniciar"
    cleanup
fi

# Iniciar Web App en background
echo "🌐 Iniciando Web App en puerto 3000..."
cd apps/web
pnpm dev &
WEB_PID=$!
cd ../..

# Esperar un poco para que la Web App se inicie
sleep 5

# Verificar que la Web App esté funcionando
if curl -s -I http://localhost:3000 | head -1 | grep -q "200 OK"; then
    echo "✅ Web App funcionando en http://localhost:3000"
else
    echo "❌ Error: Web App no se pudo iniciar"
    cleanup
fi

echo ""
echo "🎉 ¡Aplicaciones iniciadas correctamente!"
echo ""
echo "📱 URLs de acceso:"
echo "   • Web App: http://localhost:3000"
echo "   • API Health: http://localhost:3001/health"
echo ""
echo "📋 Para ver logs:"
echo "   • API: tail -f apps/api/logs/*.log (si hay archivos de log)"
echo "   • Web: Los logs aparecen en esta consola"
echo ""
echo "🛑 Presiona Ctrl+C para detener todas las aplicaciones"
echo ""

# Mantener el script corriendo y mostrar logs
wait
