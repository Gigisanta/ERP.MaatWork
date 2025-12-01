#!/bin/bash

# Script de desarrollo con TMUX para Cactus CRM
# Ejecuta API, Web, Analytics y DB logs en paneles separados
# Incluye health checks inteligentes y mejor formato de logs

set -euo pipefail

ANALYTICS_PORT="${ANALYTICS_PORT:-3002}"
ANALYTICS_BASE_URL="http://localhost:${ANALYTICS_PORT}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Nombre de la sesión TMUX
SESSION_NAME="cactus-dev"

# Obtener el directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cambiar al directorio raíz del proyecto
cd "$PROJECT_ROOT"

# Función para health check con retry
health_check() {
    local url=$1
    local name=$2
    local max_retries=${3:-15}
    local retry_delay=${4:-2}
    
    local attempt=1
    while [ $attempt -le $max_retries ]; do
        if curl -s -f -o /dev/null "$url" 2>/dev/null; then
            return 0
        fi
        sleep $retry_delay
        attempt=$((attempt + 1))
    done
    return 1
}

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

echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     CACTUS CRM - Desarrollo con TMUX                    ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Arranque limpio: limpiar puertos y procesos comunes
if [ -f "$PROJECT_ROOT/scripts/dev-clean.sh" ]; then
    echo -e "${BLUE}🧹 Limpiando entorno...${NC}"
    bash "$PROJECT_ROOT/scripts/dev-clean.sh" || true
    echo ""
fi

# Verificar si la sesión ya existe
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Sesión TMUX '$SESSION_NAME' ya existe${NC}"
    echo "Eliminando sesión existente..."
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    sleep 1
fi

# Verificar si PostgreSQL y N8N están corriendo (en Docker o local)
echo -e "${BLUE}🗄️  Verificando servicios Docker (PostgreSQL y N8N)...${NC}"
PG_LOCAL_READY=$(pg_isready -h localhost -U postgres 2>/dev/null && echo "true" || echo "false")

# Verificar servicios usando docker compose ps (solo servicios de este proyecto)
POSTGRES_RUNNING="false"
N8N_RUNNING="false"

if command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    # Usar docker compose ps para verificar solo los servicios de este proyecto
    # Parsear JSON línea por línea para encontrar servicios corriendo
    while IFS= read -r line; do
        if echo "$line" | grep -q '"Service":"db"'; then
            if echo "$line" | grep -q '"State":"running"'; then
                POSTGRES_RUNNING="true"
            fi
        fi
        if echo "$line" | grep -q '"Service":"n8n"'; then
            if echo "$line" | grep -q '"State":"running"'; then
                N8N_RUNNING="true"
            fi
        fi
    done < <(docker compose ps --format json 2>/dev/null || true)
fi

if [ "$POSTGRES_RUNNING" = "false" ] && [ "$PG_LOCAL_READY" != "true" ] || [ "$N8N_RUNNING" = "false" ]; then
    echo -e "${YELLOW}⚠️  Servicios Docker no detectados, intentando iniciar con Docker Compose...${NC}"
    if command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        docker compose up -d 2>/dev/null || echo -e "${YELLOW}⚠️  No se pudo iniciar Docker automáticamente${NC}"
        sleep 3
        echo -e "${GREEN}✅ Servicios Docker iniciados (PostgreSQL y N8N)${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker no disponible o docker-compose.yml no encontrado${NC}"
    fi
else
    if [ "$POSTGRES_RUNNING" = "true" ] || [ "$PG_LOCAL_READY" = "true" ]; then
        echo -e "${GREEN}✅ PostgreSQL detectado${NC}"
    fi
    if [ "$N8N_RUNNING" = "true" ]; then
        echo -e "${GREEN}✅ N8N detectado${NC}"
    fi
fi
echo ""

# Crear nueva sesión TMUX con mejor tamaño
tmux new-session -d -s "$SESSION_NAME" -x 120 -y 40

# Configurar layout 2x2 (mejor para debugging)
# Crear layout: dividir horizontalmente, luego verticalmente en cada mitad
tmux split-window -h -t "$SESSION_NAME:0"
tmux split-window -v -t "$SESSION_NAME:0.0"
tmux split-window -v -t "$SESSION_NAME:0.1"

# Seleccionar layout tiled (2x2 grid)
tmux select-layout -t "$SESSION_NAME" tiled

# Función para configurar panel con timestamp y colores
setup_panel() {
    local pane=$1
    local title=$2
    local command=$3
    local color=$4
    
    tmux select-pane -t "$SESSION_NAME:$pane" -T "$title"
    # Configurar colores del panel
    tmux set-window-option -t "$SESSION_NAME" pane-border-status top
    tmux set-window-option -t "$SESSION_NAME" pane-border-format "#[fg=$color]#{pane_index} #{pane_title} #[fg=default]"
    
    # Enviar comando con formato mejorado
    tmux send-keys -t "$SESSION_NAME:$pane" "$command" C-m
}

# Panel 0.0: API (arriba izquierda)
echo -e "${GREEN}🔧 Configurando panel API...${NC}"
setup_panel "0.0" "API" \
    "cd apps/api && echo -e '\033[0;32m[API] Iniciando en puerto 3001...\033[0m' && pnpm dev" \
    "green"

# Panel 0.1: Web (arriba derecha)
echo -e "${GREEN}🌐 Configurando panel Web...${NC}"
setup_panel "0.1" "Web" \
    "cd apps/web && echo -e '\033[0;34m[Web] Iniciando en puerto 3000...\033[0m' && pnpm dev" \
    "blue"

# Panel 0.2: Analytics (abajo izquierda)
echo -e "${GREEN}📊 Configurando panel Analytics...${NC}"
setup_panel "0.2" "Analytics" \
    "cd apps/analytics-service && echo -e '\033[0;36m[Analytics] Iniciando en puerto ${ANALYTICS_PORT}...\033[0m' && python main.py 2>&1 || echo -e '\033[0;33m[Analytics] No disponible (opcional)\033[0m'" \
    "cyan"

# Panel 0.3: DB Logs (abajo derecha)
echo -e "${GREEN}🗄️  Configurando panel DB Logs...${NC}"
if docker ps 2>/dev/null | grep -q "postgres"; then
    setup_panel "0.3" "DB Logs" \
        "echo -e '\033[0;35m[DB] Monitoreando logs de PostgreSQL...\033[0m' && docker compose logs -f postgres" \
        "magenta"
else
    setup_panel "0.3" "DB Logs" \
        "echo -e '\033[0;33m⚠️  PostgreSQL no detectado en Docker.\033[0m' && echo 'Inicia la DB manualmente o usa: docker compose up -d'" \
        "yellow"
fi

# Esperar un momento para que los servicios se inicien
echo ""
echo -e "${BLUE}⏳ Esperando que los servicios se inicien...${NC}"
sleep 8

# Health checks inteligentes
echo ""
echo -e "${BLUE}🏥 Verificando salud de los servicios...${NC}"
echo ""

# Health check API
echo -e "${BLUE}🔍 Verificando API (http://localhost:3001/health)...${NC}"
if health_check "http://localhost:3001/health" "API" 15 2; then
    echo -e "${GREEN}  ✅ API está funcionando${NC}"
else
    echo -e "${YELLOW}  ⚠️  API aún no responde (puede estar iniciando)${NC}"
fi
echo ""

# Health check Web
echo -e "${BLUE}🔍 Verificando Web App (http://localhost:3000)...${NC}"
if health_check "http://localhost:3000" "Web" 20 2; then
    echo -e "${GREEN}  ✅ Web App está funcionando${NC}"
else
    echo -e "${YELLOW}  ⚠️  Web App aún no responde (puede estar iniciando)${NC}"
fi
echo ""

# Health check Analytics (opcional)
echo -e "${BLUE}🔍 Verificando Analytics Service (${ANALYTICS_BASE_URL}/health)...${NC}"
if health_check "${ANALYTICS_BASE_URL}/health" "Analytics" 5 2; then
    echo -e "${GREEN}  ✅ Analytics Service está funcionando${NC}"
else
    echo -e "${YELLOW}  ⚠️  Analytics Service no disponible (opcional)${NC}"
fi
echo ""

# Información de la sesión
echo -e "${GREEN}✅ Sesión TMUX '$SESSION_NAME' creada correctamente${NC}"
echo ""
echo -e "${BOLD}${YELLOW}📋 Información:${NC}"
echo -e "  • Sesión TMUX: ${GREEN}$SESSION_NAME${NC}"
echo -e "  • Web App: ${CYAN}http://localhost:3000${NC}"
echo -e "  • API: ${CYAN}http://localhost:3001${NC}"
echo -e "  • API Health: ${CYAN}http://localhost:3001/health${NC}"
echo -e "  • Analytics: ${CYAN}${ANALYTICS_BASE_URL}${NC} (opcional)"
echo ""
echo -e "${BOLD}${YELLOW}⌨️  Comandos útiles:${NC}"
echo -e "  • Conectar: ${GREEN}tmux attach -t $SESSION_NAME${NC}"
echo -e "  • Detach: ${YELLOW}Ctrl+b d${NC}"
echo -e "  • Matar sesión: ${RED}pnpm run dev:kill${NC} o ${RED}tmux kill-session -t $SESSION_NAME${NC}"
echo ""
echo -e "${BOLD}${YELLOW}🖥️  Atajos TMUX:${NC}"
echo -e "  • ${GREEN}Ctrl+b o${NC} - Cambiar entre paneles"
echo -e "  • ${GREEN}Ctrl+b ←→↑↓${NC} - Navegar entre paneles"
echo -e "  • ${GREEN}Ctrl+b x${NC} - Cerrar panel actual"
echo -e "  • ${GREEN}Ctrl+b z${NC} - Maximizar/restaurar panel"
echo -e "  • ${GREEN}Ctrl+b d${NC} - Detach de la sesión"
echo -e "  • ${GREEN}Ctrl+b [${NC} - Modo scroll (q para salir)"
echo -e "  • ${GREEN}Ctrl+b r${NC} - Recargar configuración tmux"
echo -e "  • ${GREEN}Ctrl+b f${NC} - Búsqueda mejorada"
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
