#!/bin/bash

# Script de desarrollo con TMUX para Cactus CRM
# Ejecuta API, Web, Analytics y DB logs en paneles separados

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que TMUX esté instalado
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}❌ Error: TMUX no está instalado${NC}"
    echo ""
    echo "Por favor, instala TMUX:"
    echo "  macOS:   brew install tmux"
    echo "  Ubuntu:  sudo apt-get install tmux"
    echo "  Arch:    sudo pacman -S tmux"
    exit 1
fi

# Nombre de la sesión TMUX
SESSION_NAME="cactus-dev"

echo -e "${GREEN}🚀 Iniciando Cactus CRM en modo desarrollo (TMUX)${NC}"
echo ""

# Arranque limpio: limpiar puertos y procesos comunes
if [ -f "$PROJECT_ROOT/scripts/dev-clean.sh" ]; then
    bash "$PROJECT_ROOT/scripts/dev-clean.sh" || true
fi

# Verificar si la sesión ya existe
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Sesión TMUX '$SESSION_NAME' ya existe${NC}"
    echo ""
    echo "Eliminando sesión existente..."
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    sleep 1
fi

# Función para limpiar al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo todos los servicios...${NC}"
    
    # Detener servicios en ejecución
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "python.*main.py" 2>/dev/null || true
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    
    # Matar sesión TMUX si existe
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Todos los servicios detenidos${NC}"
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT SIGTERM

# Obtener el directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cambiar al directorio raíz del proyecto
cd "$PROJECT_ROOT"

# Verificar si PostgreSQL está corriendo (en Docker o local)
if ! docker ps | grep -q "postgres" 2>/dev/null && ! pg_isready -h localhost -U postgres 2>/dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL no detectado, iniciando con Docker...${NC}"
    docker compose up -d 2>/dev/null || echo -e "${YELLOW}⚠️  No se pudo iniciar Docker automáticamente${NC}"
fi

# Crear nueva sesión TMUX
tmux new-session -d -s "$SESSION_NAME" -x 120 -y 40

# Configurar paneles
# Dividir en 4 paneles verticales
tmux split-window -h -t "$SESSION_NAME"
tmux split-window -h -t "$SESSION_NAME"
tmux split-window -h -t "$SESSION_NAME"
tmux select-layout -t "$SESSION_NAME" even-horizontal

# Panel 1: API
echo -e "${GREEN}🔧 Configurando panel API...${NC}"
tmux select-pane -t "$SESSION_NAME:0.0" -T "API"
tmux send-keys -t "$SESSION_NAME:0.0" "cd apps/api && pnpm dev" C-m

# Panel 2: Web
echo -e "${GREEN}🌐 Configurando panel Web...${NC}"
tmux select-pane -t "$SESSION_NAME:0.1" -T "Web"
tmux send-keys -t "$SESSION_NAME:0.1" "cd apps/web && pnpm dev" C-m

# Panel 3: Analytics
echo -e "${GREEN}📊 Configurando panel Analytics...${NC}"
tmux select-pane -t "$SESSION_NAME:0.2" -T "Analytics"
tmux send-keys -t "$SESSION_NAME:0.2" "cd apps/analytics-service && python main.py" C-m

# Panel 4: DB Logs
echo -e "${GREEN}🗄️  Configurando panel DB Logs...${NC}"
tmux select-pane -t "$SESSION_NAME:0.3" -T "DB Logs"

# Verificar si PostgreSQL está en Docker
if docker ps | grep -q "postgres"; then
    tmux send-keys -t "$SESSION_NAME:0.3" "docker compose logs -f postgres" C-m
else
    tmux send-keys -t "$SESSION_NAME:0.3" "echo '⚠️  PostgreSQL no detectado en Docker. Inicia la DB manualmente o usa: docker compose up -d'" C-m
fi

# Esperar un momento para que los servicios se inicien
sleep 5

# Verificar servicios
echo ""
echo -e "${GREEN}✅ Sesión TMUX '$SESSION_NAME' creada correctamente${NC}"
echo ""
echo -e "${YELLOW}📋 Información:${NC}"
echo "  • Sesión TMUX: ${GREEN}$SESSION_NAME${NC}"
echo "  • Web App: http://localhost:3000"
echo "  • API: http://localhost:3001"
echo "  • API Health: http://localhost:3001/health"
echo "  • Analytics: http://localhost:3002"
echo "  • Analytics Health: http://localhost:3002/health"
echo ""
echo -e "${YELLOW}⌨️  Comandos útiles:${NC}"
echo "  • Conectar: ${GREEN}tmux attach -t $SESSION_NAME${NC}"
echo "  • Detach: ${YELLOW}Ctrl+b d${NC}"
echo "  • Matar sesión: ${RED}pnpm run dev:kill${NC} o ${RED}tmux kill-session -t $SESSION_NAME${NC}"
echo ""
echo -e "${YELLOW}🖥️  Atajos TMUX:${NC}"
echo "  • ${GREEN}Ctrl+b o${NC} - Cambiar entre paneles"
echo "  • ${GREEN}Ctrl+b x${NC} - Cerrar panel actual"
echo "  • ${GREEN}Ctrl+b z${NC} - Maximizar/restaurar panel"
echo "  • ${GREEN}Ctrl+b d${NC} - Detach de la sesión"
echo "  • ${GREEN}Ctrl+b [${NC} - Modo scroll (Esc para salir)"
echo ""

# Conectar a la sesión si estamos en terminal interactiva
if [ -t 0 ]; then
    exec tmux attach -t "$SESSION_NAME"
else
    echo ""
    echo -e "${GREEN}✅ Servicios iniciados en segundo plano${NC}"
    echo -e "${YELLOW}💡 Ejecuta: ${GREEN}tmux attach -t $SESSION_NAME${NC} para ver los paneles"
    exit 0
fi

