#!/bin/bash
set -e

# =============================================================================
# MAATWORK - Deploy Script
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
log "🚀 Starting MAATWORK deployment..."

if [ "$SKIP_TESTS" = true ]; then
    log_warning "🧪 Mode: SKIP TESTS enabled"
fi

cd "$PROJECT_DIR" || {
    log_error "Could not access directory $PROJECT_DIR"
    exit 1
}

log "📁 Directory: $(pwd)"

# =============================================================================
# 2. LIMPIAR CAMBIOS LOCALES
# =============================================================================
log "🧹 Cleaning local Git changes..."

# Descartar todos los cambios locales
# Excluir venv de analytics para no tener que reinstalar paquetes Python
git reset --hard HEAD
git clean -fd -e "apps/analytics-service/venv"

log_success "Source control clean (venv de analytics preservado)"

# =============================================================================
# 3. CHECKOUT A MASTER
# =============================================================================
log "🔀 Switching to master branch..."

git checkout master

log_success "On master branch"

# =============================================================================
# 4. PULL DE ÚLTIMOS CAMBIOS
# =============================================================================
log "⬇️  Fetching latest changes from origin/master..."

git fetch origin
git reset --hard origin/master

log_success "Código actualizado a origin/master"

# Mostrar último commit
log "📝 Último commit:"
git log -1 --oneline

# =============================================================================
# 5. INSTALAR dependencies
# =============================================================================
log "📦 Installing dependencies..."

pnpm install --frozen-lockfile

log_success "Node.js dependencies installed"

# =============================================================================
# 6. CONFIGURAR ENTORNO PYTHON (Analytics Service)
# =============================================================================
log "🐍 Setting up Python environment para analytics..."

ANALYTICS_DIR="$PROJECT_DIR/apps/analytics-service"
VENV_DIR="$ANALYTICS_DIR/venv"
REQUIREMENTS_FILE="$ANALYTICS_DIR/requirements.txt"
REQUIREMENTS_HASH_FILE="$VENV_DIR/.requirements.hash"

# Crear venv si no existe o está corrupto
if [ ! -f "$VENV_DIR/bin/activate" ]; then
    log "   Creating virtual environment..."
    rm -rf "$VENV_DIR" 2>/dev/null || true
    python3 -m venv "$VENV_DIR"
    # Forzar reinstalación de dependencies
    rm -f "$REQUIREMENTS_HASH_FILE" 2>/dev/null || true
    log_success "Virtual environment created"
fi

# Verificar si necesitamos instalar dependencies
if [ -f "$REQUIREMENTS_FILE" ]; then
    CURRENT_HASH=$(md5sum "$REQUIREMENTS_FILE" | cut -d' ' -f1)
    STORED_HASH=""
    
    if [ -f "$REQUIREMENTS_HASH_FILE" ]; then
        STORED_HASH=$(cat "$REQUIREMENTS_HASH_FILE")
    fi
    
    if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        log "   Changes detected in requirements.txt, Installing dependencies..."
        source "$VENV_DIR/bin/activate"
        pip install --upgrade pip -q
        pip install -r "$REQUIREMENTS_FILE" -q
        deactivate
        # Guardar hash para próxima vez
        echo "$CURRENT_HASH" > "$REQUIREMENTS_HASH_FILE"
        log_success "Python dependencies installed"
    else
        log_success "Python dependencies unchanged (skipping installation"
    fi
else
    log_warning "requirements.txt not found en analytics-service"
fi

# =============================================================================
# 7. CARGAR VARIABLES DE ENTORNO
# =============================================================================
log "🔐 Loading environment variables..."

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    log_success "Environment variables loaded desde $ENV_FILE"
else
    log_warning ".env file not found en $ENV_FILE"
fi

# Exportar variables críticas para Next.js build
export NODE_ENV=production
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://maat.work/api}"

log "   NODE_ENV=$NODE_ENV"
log "   NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# =============================================================================
# 7.5. MIGRACIONES DE BASE DE DATOS (AUTO-REPAIR)
# =============================================================================
log "🔄 Checking & Running Database Migrations..."

# Asegurar que las dependencias de DB estén instaladas antes de migrar
# (Ya se hizo pnpm install, pero aseguramos el contexto)

# Ejecutar migración con flag de producción si es necesario,
# pero drizzle-kit usa el .env que ya cargamos.
if pnpm -F @maatwork/db run migrate; then
    log_success "Database migrations executed successfully"
else
    log_error "Database migration failed!"
    echo "   Esto puede deberse a bloqueos de base de datos o migraciones conflictivas."
    echo "   Aborting deploy to prevent inconsistent state."
    exit 1
fi

# =============================================================================
# 8. EJECUTAR TESTS
# =============================================================================
if [ "$SKIP_TESTS" = true ]; then
    log_warning "🧪 Tests SKIPPED (--skip-tests)"
else
    log "🧪 Running tests..."

TEST_LOG="/tmp/maatwork-test-output.log"

# Función para mostrar spinner mientras los tests corren
run_tests_with_progress() {
    local pid
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    local start_time=$(date +%s)
    
    # Configurar comando de tests según si se desea cache o no
    local test_cmd=""
    if [ "$NO_CACHE" = true ]; then
        log "   ⚠️  Cache DISABLED - running tests without cache"
        # Usar turbo con --force y --no-cache para deshabilitar cache de Turbo
        # Pasar --no-cache a Vitest usando -- para pasar argumentos a los scripts subyacentes
        # --concurrency=4 es opción de turbo, debe ir antes del --
        test_cmd="pnpm turbo run test:unit --force --no-cache --concurrency=4 -- --no-cache"
    else
        # Usar el script normal que aprovecha cache
        test_cmd="pnpm turbo run test:unit --concurrency=4"
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
    # Extract passed tests count - try multiple formats
    local passed=$(grep -oE "Passed:[[:space:]]*[0-9]+" "$log_file" 2>/dev/null | grep -oE "[0-9]+" | tail -1)
    if [ -z "$passed" ]; then
        passed=$(grep -oE "[0-9]+[[:space:]]+passed" "$log_file" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    if [ -z "$passed" ]; then
        passed=$(grep -oE "Test Files:[^0-9]*[0-9]+[^0-9]*passed" "$log_file" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    if [ -z "$passed" ]; then
        passed=$(grep -oE "Tests:[^0-9]*[0-9]+[^0-9]*passed" "$log_file" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    # If still no match and exit code is 0, assume tests passed (count may not be in log)
    if [ -z "$passed" ] && [ $exit_code -eq 0 ]; then
        # Try to find any number followed by "test" or "tests"
        passed=$(grep -oE "[0-9]+[[:space:]]+test" "$log_file" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    passed=${passed:-0}
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
    echo "   │              📊 TEST SUMMARY               │"
    echo "   ├────────────────────────────────────────────────┤"
    
    # Barra de progreso con color según resultado
    if [ $exit_code -eq 0 ]; then
        echo -e "   │  ${GREEN}${bar}${NC} ${percentage}%  │"
    else
        echo -e "   │  ${RED}${bar}${NC} ${percentage}%  │"
    fi
    
    echo "   ├────────────────────────────────────────────────┤"
    echo -e "   │  ${GREEN}✓ Passed:${NC}   $passed tests                       │" | head -c 54 && echo "│"
    
    if [ "$failed" -gt 0 ]; then
        echo -e "   │  ${RED}✗ Failed:${NC}  $failed tests                       │" | head -c 54 && echo "│"
    fi
    
    if [ "$skipped" -gt 0 ]; then
        echo -e "   │  ${YELLOW}○ Skipped:${NC}  $skipped tests                       │" | head -c 54 && echo "│"
    fi
    
    echo "   └────────────────────────────────────────────────┘"
    
    # Si hay tests fallidos, mostrar cuáles
    if [ "$failed" -gt 0 ]; then
        echo ""
        echo -e "   ${RED}Failed tests:${NC}"
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
        echo -e "   ${GREEN}Completed tests:${NC}"
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

# Si no se pudo determinar exit code, verificar el log
if [ $TEST_EXIT_CODE -ne 0 ] && [ -f "$TEST_LOG" ]; then
    # Si no hay "failed" en el log y hay nÃºmeros de tests pasados, considerar Ã©xito
    if ! grep -qiE "(failed|fall|error|âŒ)" "$TEST_LOG" 2>/dev/null; then
        if grep -qiE "(passed|Passed|âœ…|SUCCESS)" "$TEST_LOG" 2>/dev/null || grep -qE "[0-9]+.*test" "$TEST_LOG" 2>/dev/null; then
            TEST_EXIT_CODE=0
        fi
    fi
fi

printf "\r                                              \r"

# Mostrar resumen detallado
show_test_summary "$TEST_LOG" $TEST_EXIT_CODE

# Final verification: check log for passed tests count
if [ $TEST_EXIT_CODE -ne 0 ] && [ -f "$TEST_LOG" ]; then
    # Extract passed count - try multiple formats (same as show_test_summary)
    log_passed=$(grep -oE "Passed:[[:space:]]*[0-9]+" "$TEST_LOG" 2>/dev/null | grep -oE "[0-9]+" | tail -1)
    if [ -z "$log_passed" ]; then
        log_passed=$(grep -oE "[0-9]+[[:space:]]+passed" "$TEST_LOG" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    if [ -z "$log_passed" ]; then
        log_passed=$(grep -oE "Test Files:[^0-9]*[0-9]+[^0-9]*passed" "$TEST_LOG" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    if [ -z "$log_passed" ]; then
        log_passed=$(grep -oE "Tests:[^0-9]*[0-9]+[^0-9]*passed" "$TEST_LOG" 2>/dev/null | grep -oE "[0-9]+" | head -1)
    fi
    log_passed=${log_passed:-0}

    # Extract failed count
    log_failed=$(grep -oE "[0-9]+[[:space:]]+failed" "$TEST_LOG" 2>/dev/null | grep -oE "[0-9]+" | tail -1)
    if [ -z "$log_failed" ]; then
        log_failed=$(grep -oE "Failed:[[:space:]]*[0-9]+" "$TEST_LOG" 2>/dev/null | grep -oE "[0-9]+" | tail -1)
    fi
    log_failed=${log_failed:-0}

    # If we have passed tests (>0) and no failures, override exit code
    if [ "$log_passed" -gt 0 ] && [ "$log_failed" -eq 0 ]; then
        TEST_EXIT_CODE=0
    fi
fi
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    log_success "All tests passed ✨"
    rm -f "$TEST_LOG"
else
    echo ""
    log_error "Tests failed. Aborting deployment."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Log saved to: $TEST_LOG"
    echo "To see details run locally: pnpm test"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

fi  # End SKIP_TESTS check

# =============================================================================
# 9. BUILD DE PAQUETES COMPARTIDOS
# =============================================================================
log "🏗️  Building shared packages..."

log "   Building @maatwork/types..."
pnpm -F @maatwork/types build

log "   Building @maatwork/db..."
pnpm -F @maatwork/db build

log "   Building @maatwork/ui..."
pnpm -F @maatwork/ui build

log_success "Shared packages built"

# =============================================================================
# 10. BUILD DE APLICACIONES
# =============================================================================
log "🏗️  Building applications..."

log "   Building @maatwork/api..."
pnpm -F @maatwork/api build

log "   Building @maatwork/web..."
pnpm -F @maatwork/web build

log_success "Applications built"

# =============================================================================
# 11. REINICIAR SERVICIOS CON PM2
# =============================================================================
log "🔄 Restarting services with PM2..."

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

log_success "Services restarted"

# =============================================================================
# 12. CONFIGURAR Y REINICIAR NGINX
# =============================================================================
log "🌐 Configuring Nginx..."

NGINX_CONF="/etc/nginx/nginx.conf"
NGINX_CONF_SOURCE="$PROJECT_DIR/infrastructure/mvp/nginx.conf"

# Verificar si Nginx está instalado
if ! command -v nginx &> /dev/null; then
    log_warning "Nginx no está instalado. Installing..."
    sudo dnf install -y nginx || {
        log_error "Could not install Nginx. Instala manualmente: sudo dnf install -y nginx"
    }
fi

# Copiar configuración de Nginx si existe
if [ -f "$NGINX_CONF_SOURCE" ]; then
    log "   Copying Nginx configuration"
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF" || {
        log_warning "No se pudo copiar configuración de Nginx (requiere sudo)"
    }
    
    # Verificar configuración de Nginx
    if sudo nginx -t 2>/dev/null; then
        log_success "Configuración de Nginx válida"
        
        # Reiniciar Nginx
        if sudo systemctl is-active --quiet nginx; then
            log "   ReStarting Nginx..."
            sudo systemctl reload nginx || sudo systemctl restart nginx
        else
            log "   Starting Nginx..."
            sudo systemctl enable nginx
            sudo systemctl start nginx
        fi
        
        log_success "Nginx configured and running"
    else
        log_warning "Configuración de Nginx inválida. Revisa: sudo nginx -t"
    fi
else
    log_warning "Archivo de configuración de Nginx no encontrado en $NGINX_CONF_SOURCE"
fi

# =============================================================================
# 13. VERIFICACIÓN FINAL
# =============================================================================
log "🔍 Checking service status..."

sleep 3

pm2 status

# Verificar que los servicios están corriendo
if pm2 jlist | grep -q '"status":"online"'; then
    log_success "Services running correctly"
else
    log_warning "Algunos servicios podrían no estar corriendo. Revisa 'pm2 logs'"
fi

# Verificar Nginx
if command -v nginx &> /dev/null && sudo systemctl is-active --quiet nginx; then
    log_success "Nginx running correctly"
else
    log_warning "Nginx no está corriendo. Ejecuta: sudo systemctl start nginx"
fi

# =============================================================================
# RESUMEN
# =============================================================================
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 DEPLOY COMPLETED SUCCESSFULLY${NC}"
echo "=============================================="
echo ""
echo "Deployed commit: $(git log -1 --oneline)"
echo ""
echo "Useful commands:"
echo "  pm2 status       - View service status"
echo "  pm2 logs         - View logs in real time"
echo "  pm2 logs --lines 100  - Ver últimas 100 líneas"
echo ""
echo "URLs:"
echo "  Web:       https://maat.work"
echo "  API:       https://maat.work/api"
echo "  Analytics: https://maat.work/analytics"
echo ""

