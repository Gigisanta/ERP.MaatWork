#!/bin/bash

# Limpieza de puertos y procesos para un arranque limpio de desarrollo
# Puertos objetivo: 3000 (Web), 3001 (API), 3002 (Analytics)

set -euo pipefail

echo "🧹 Limpiando entorno de desarrollo (puertos y procesos)"

kill_port() {
  local PORT="$1"
  if lsof -ti ":$PORT" >/dev/null 2>&1; then
    echo "🔪 Matando procesos en puerto $PORT..."
    # macOS: -r (GNU xargs) no siempre existe; usar condición manual
    PIDS=$(lsof -ti ":$PORT" || true)
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill -9 >/dev/null 2>&1 || true
    fi
  fi
}

# Matar procesos Node/Next/TSX comunes (adicional a matar por puerto)
pkill -f "next dev"      >/dev/null 2>&1 || true
pkill -f "tsx watch"      >/dev/null 2>&1 || true
pkill -f "node dist/"     >/dev/null 2>&1 || true
pkill -f "analytics-service.*python" >/dev/null 2>&1 || true

# Limpiar puertos típicos
kill_port 3000
kill_port 3001
kill_port 3002

echo "✅ Entorno limpio"



