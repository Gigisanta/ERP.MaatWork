#!/bin/bash
set -e

# =============================================================================
# CACTUS CRM - Deploy Script
# =============================================================================
# Este script despliega la última versión de master en el servidor
# Uso: ./deploy.sh [--skip-tests] [--no-cache]
# 
# Opciones:
#   --skip-tests    Salta la ejecución de tests
#   --no-cache      Ejecuta tests sin usar cache (útil para ejecuciones remotas)
# =============================================================================

# Opciones
SKIP_TESTS=false
NO_CACHE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-tests) SKIP_TESTS=true ;;
        --no-cache) NO_CACHE=true ;;
        *) echo "Opción desconocida: $1"; exit 1 ;;
    esac
    shift
done

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="/home/ec2-user/abax"
ENV_FILE="/home/ec2-user/abax/infrastructure/mvp/.env"

# Función para logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# =============================================================================
# 1. PREPARACIÓN
# =============================================================================
log "🚀 Iniciando deploy de CACTUS CRM..."

cd "$PROJECT_DIR" || {
    log_error "No se pudo acceder al directorio $PROJECT_DIR"
    exit 1
}

log "📁 Directorio: $(pwd)"

# =============================================================================
# 2. LIMPIAR CAMBIOS LOCALES
# =============================================================================
log "🧹 Limpiando cambios locales de Git..."

# Descartar todos los cambios locales
# Excluir venv de analytics para no tener que reinstalar paquetes Python
git reset --hard HEAD
git clean -fd -e "apps/analytics-service/venv"

log_success "Source control limpio (venv de analytics preservado)"

# =============================================================================
# 3. CHECKOUT A MASTER
# =============================================================================
log "🔀 Cambiando a rama master..."

git checkout master

log_success "En rama master"

# =============================================================================
# 4. PULL DE ÚLTIMOS CAMBIOS
# =============================================================================
log "⬇️  Descargando últimos cambios de origin/master..."

git fetch origin
git reset --hard origin/master

log_success "Código actualizado a origin/master"

# Mostrar último commit
log "📝 Último commit:"
git log -1 --oneline

# =============================================================================
# 5. INSTALAR DEPENDENCIAS
# =============================================================================
log "📦 Instalando dependencias..."

pnpm install --frozen-lockfile

log_success "Dependencias Node.js instaladas"

# =============================================================================
# 6. CONFIGURAR ENTORNO PYTHON (Analytics Service)
# =============================================================================
log "🐍 Configurando entorno Python para analytics..."

ANALYTICS_DIR="$PROJECT_DIR/apps/analytics-service"
VENV_DIR="$ANALYTICS_DIR/venv"
REQUIREMENTS_FILE="$ANALYTICS_DIR/requirements.txt"
REQUIREMENTS_HASH_FILE="$VENV_DIR/.requirements.hash"

# Crear venv si no existe o está corrupto
if [ ! -f "$VENV_DIR/bin/activate" ]; then
    log "   Creando virtual environment..."
    rm -rf "$VENV_DIR" 2>/dev/null || true
    python3 -m venv "$VENV_DIR"
    # Forzar reinstalación de dependencias
    rm -f "$REQUIREMENTS_HASH_FILE" 2>/dev/null || true
    log_success "Virtual environment creado"
fi

# Verificar si necesitamos instalar dependencias
if [ -f "$REQUIREMENTS_FILE" ]; then
    CURRENT_HASH=$(md5sum "$REQUIREMENTS_FILE" | cut -d' ' -f1)
    STORED_HASH=""
    
    if [ -f "$REQUIREMENTS_HASH_FILE" ]; then
        STORED_HASH=$(cat "$REQUIREMENTS_HASH_FILE")
    fi
    
    if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        log "   Detectados cambios en requirements.txt, instalando dependencias..."
        source "$VENV_DIR/bin/activate"
        pip install --upgrade pip -q
        pip install -r "$REQUIREMENTS_FILE" -q
        deactivate
        # Guardar hash para próxima vez
        echo "$CURRENT_HASH" > "$REQUIREMENTS_HASH_FILE"
        log_success "Dependencias Python instaladas"
    else
        log_success "Dependencias Python sin cambios (saltando instalación)"
    fi
else
    log_warning "requirements.txt no encontrado en analytics-service"
fi

# =============================================================================
# 7. CARGAR VARIABLES DE ENTORNO
# =============================================================================
log "🔐 Cargando variables de entorno..."

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    log_success "Variables de entorno cargadas desde $ENV_FILE"
else
    log_warning "Archivo .env no encontrado en $ENV_FILE"
fi

# Exportar variables críticas para Next.js build
export NODE_ENV=production
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://maat.work/api}"

log "   NODE_ENV=$NODE_ENV"
log "   NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# =============================================================================
# 8. EJECUTAR TESTS
# =============================================================================
if [ "$SKIP_TESTS" = true ]; then
    log_warning "🧪 Tests SALTADOS (--skip-tests)"
else
    log "🧪 Ejecutando tests..."

TEST_LOG="/tmp/cactus-test-output.log"

# Función para mostrar spinner mientras los tests corren
run_tests_with_progress() {
    local pid
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    local start_time=$(date +%s)
    
    # Configurar comando de tests según si se desea cache o no
    local test_cmd=""
    if [ "$NO_CACHE" = true ]; then
        log "   ⚠️  Cache DESHABILITADO - ejecutando tests sin cache"
        # Usar turbo con --force y --no-cache para deshabilitar cache de Turbo
        # Pasar --no-cache a Vitest usando -- para pasar argumentos a los scripts subyacentes
        # --concurrency=4 es opción de turbo, debe ir antes del --
        test_cmd="pnpm turbo run test:unit --force --no-cache --concurrency=4 -- --no-cache"
    else
        # Usar el script normal que aprovecha cache
        test_cmd="pnpm test"
    fi
    
    # Ejecutar tests en background, capturando output
    eval "$test_cmd" > "$TEST_LOG" 2>&1 &
    pid=$!
    
    # Mostrar spinner mientras los tests corren
    printf "   "
    while kill -0 $pid 2>/dev/null; do
        local elapsed=$(($(date +%s) - start_time))
        local mins=$((elapsed / 60))
        local secs=$((elapsed % 60))
        printf "\r   ${spin:i++%${#spin}:1} Tests ejecutándose... [%02d:%02d]" $mins $secs
        sleep 0.1
    done
    
    # Obtener exit code del proceso
    wait $pid
    return $?
}

# Función para mostrar resumen detallado de tests
show_test_summary() {
    local log_file=$1
    local exit_code=$2
    
    # Extraer números
    local passed=$(grep -oP '\d+(?= passed)' "$log_file" 2>/dev/null | tail -1)
    local failed=$(grep -oP '\d+(?= failed)' "$log_file" 2>/dev/null | tail -1)
    local skipped=$(grep -oP '\d+(?= skipped)' "$log_file" 2>/dev/null | tail -1)
    
    # Asegurar valores por defecto si están vacíos
    passed=${passed:-0}
    failed=${failed:-0}
    skipped=${skipped:-0}
    
    local total=$((passed + failed))
    
    # Calcular porcentaje
    local percentage=0
    if [ "$total" -gt 0 ]; then
        percentage=$((passed * 100 / total))
    fi
    
    # Crear barra de progreso visual (40 caracteres)
    local bar_width=40
    local filled=$((percentage * bar_width / 100))
    local empty=$((bar_width - filled))
    local bar=""
    
    for ((j=0; j<filled; j++)); do bar+="█"; done
    for ((j=0; j<empty; j++)); do bar+="░"; done
    
    echo ""
    echo "   ┌────────────────────────────────────────────────┐"
    echo "   │              📊 RESUMEN DE TESTS               │"
    echo "   ├────────────────────────────────────────────────┤"
    
    # Barra de progreso con color según resultado
    if [ $exit_code -eq 0 ]; then
        echo -e "   │  ${GREEN}${bar}${NC} ${percentage}%  │"
    else
        echo -e "   │  ${RED}${bar}${NC} ${percentage}%  │"
    fi
    
    echo "   ├────────────────────────────────────────────────┤"
    echo -e "   │  ${GREEN}✓ Pasaron:${NC}   $passed tests                       │" | head -c 54 && echo "│"
    
    if [ "$failed" -gt 0 ]; then
        echo -e "   │  ${RED}✗ Fallaron:${NC}  $failed tests                       │" | head -c 54 && echo "│"
    fi
    
    if [ "$skipped" -gt 0 ]; then
        echo -e "   │  ${YELLOW}○ Saltados:${NC}  $skipped tests                       │" | head -c 54 && echo "│"
    fi
    
    echo "   └────────────────────────────────────────────────┘"
    
    # Si hay tests fallidos, mostrar cuáles
    if [ "$failed" -gt 0 ]; then
        echo ""
        echo -e "   ${RED}Tests fallidos:${NC}"
        echo "   ─────────────────────────────────────────────"
        # Extraer nombres de tests fallidos del log de Vitest
        grep -E "^[[:space:]]*(✗|×|FAIL)" "$log_file" 2>/dev/null | head -20 | while read -r line; do
            echo -e "   ${RED}$line${NC}"
        done
        echo "   ─────────────────────────────────────────────"
    fi
    
    # Mostrar algunos tests que pasaron (máximo 10)
    if [ $passed -gt 0 ] && [ $exit_code -eq 0 ]; then
        echo ""
        echo -e "   ${GREEN}Tests completados:${NC}"
        echo "   ─────────────────────────────────────────────"
        # Extraer nombres de archivos de test
        grep -oP '✓ [^\n]+|√ [^\n]+|PASS [^\n]+' "$log_file" 2>/dev/null | head -10 | while read -r line; do
            echo -e "   ${GREEN}$line${NC}"
        done
        local remaining=$((passed - 10))
        if [ $remaining -gt 0 ]; then
            echo -e "   ${GREEN}... y $remaining tests más${NC}"
        fi
        echo "   ─────────────────────────────────────────────"
    fi
}

# Ejecutar tests con progress
TEST_EXIT_CODE=0
if run_tests_with_progress; then
    TEST_EXIT_CODE=0
else
    TEST_EXIT_CODE=1
fi

printf "\r                                              \r"

# Mostrar resumen detallado
show_test_summary "$TEST_LOG" $TEST_EXIT_CODE

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    log_success "Todos los tests pasaron ✨"
    rm -f "$TEST_LOG"
else
    echo ""
    log_error "Los tests fallaron. Abortando deploy."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Log guardado en: $TEST_LOG"
    echo "Para ver detalles ejecuta localmente: pnpm test"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

fi  # End SKIP_TESTS check

# =============================================================================
# 9. BUILD DE PAQUETES COMPARTIDOS
# =============================================================================
log "🏗️  Construyendo paquetes compartidos..."

log "   Building @cactus/db..."
pnpm -F @cactus/db build

log "   Building @cactus/ui..."
pnpm -F @cactus/ui build

log_success "Paquetes compartidos construidos"

# =============================================================================
# 10. BUILD DE APLICACIONES
# =============================================================================
log "🏗️  Construyendo aplicaciones..."

log "   Building @cactus/api..."
pnpm -F @cactus/api build

log "   Building @cactus/web..."
pnpm -F @cactus/web build

log_success "Aplicaciones construidas"

# =============================================================================
# 11. REINICIAR SERVICIOS CON PM2
# =============================================================================
log "🔄 Reiniciando servicios con PM2..."

# AI_DECISION: Exportar variables necesarias para PM2
# Justificación: JWT_SECRET y API_URL_INTERNAL deben estar disponibles en runtime
#                para que el middleware de Next.js valide tokens correctamente
# Impacto: Autenticación funciona correctamente detrás de Cloudflare
if [ -f apps/api/.env ]; then
    export JWT_SECRET=$(grep '^JWT_SECRET=' apps/api/.env | cut -d'=' -f2-)
    log "   JWT_SECRET cargado desde apps/api/.env"
fi
export API_URL_INTERNAL="http://127.0.0.1:3001"

# Detener servicios existentes (ignorar errores si no existen)
pm2 stop all 2>/dev/null || true

# Iniciar/reiniciar con ecosystem.config.js y actualizar env vars
pm2 start ecosystem.config.js --update-env

# Guardar configuración de PM2
pm2 save

log_success "Servicios reiniciados"

# =============================================================================
# 12. VERIFICACIÓN FINAL
# =============================================================================
log "🔍 Verificando estado de servicios..."

sleep 3

pm2 status

# Verificar que los servicios están corriendo
if pm2 jlist | grep -q '"status":"online"'; then
    log_success "Servicios corriendo correctamente"
else
    log_warning "Algunos servicios podrían no estar corriendo. Revisa 'pm2 logs'"
fi

# =============================================================================
# RESUMEN
# =============================================================================
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 DEPLOY COMPLETADO EXITOSAMENTE${NC}"
echo "=============================================="
echo ""
echo "Commit desplegado: $(git log -1 --oneline)"
echo ""
echo "Comandos útiles:"
echo "  pm2 status       - Ver estado de servicios"
echo "  pm2 logs         - Ver logs en tiempo real"
echo "  pm2 logs --lines 100  - Ver últimas 100 líneas"
echo ""
echo "URLs:"
echo "  Web:       https://maat.work"
echo "  API:       https://maat.work/api"
echo "  Analytics: https://maat.work/analytics"
echo ""

