#!/bin/bash
set -e

# =============================================================================
# CACTUS CRM - Deploy Script
# =============================================================================
# Este script despliega la última versión de master en el servidor
# Uso: ./deploy.sh
# =============================================================================

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

# Crear venv si no existe
if [ ! -d "$VENV_DIR" ]; then
    log "   Creando virtual environment..."
    python3 -m venv "$VENV_DIR"
    log_success "Virtual environment creado"
fi

# Instalar/actualizar dependencias Python
if [ -f "$ANALYTICS_DIR/requirements.txt" ]; then
    log "   Instalando dependencias Python..."
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip -q
    pip install -r "$ANALYTICS_DIR/requirements.txt" -q
    deactivate
    log_success "Dependencias Python instaladas"
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
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://56.125.148.180/api}"

log "   NODE_ENV=$NODE_ENV"
log "   NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# =============================================================================
# 8. EJECUTAR TESTS
# =============================================================================
log "🧪 Ejecutando tests..."

TEST_LOG="/tmp/cactus-test-output.log"

# Función para mostrar spinner mientras los tests corren
run_tests_with_progress() {
    local pid
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    local start_time=$(date +%s)
    
    # Ejecutar tests en background, capturando output
    pnpm test > "$TEST_LOG" 2>&1 &
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

# Ejecutar tests con progress
if run_tests_with_progress; then
    printf "\r                                              \r"
    
    # Extraer resumen de tests del log
    PASSED=$(grep -oP '\d+(?= passed)' "$TEST_LOG" | tail -1 || echo "0")
    FAILED=$(grep -oP '\d+(?= failed)' "$TEST_LOG" | tail -1 || echo "0")
    TOTAL=$((PASSED + FAILED))
    
    echo -e "   ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   ${GREEN}✓ Tests completados: $PASSED/$TOTAL pasaron${NC}"
    echo -e "   ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log_success "Todos los tests pasaron"
else
    printf "\r                                              \r"
    echo -e "   ${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   ${RED}✗ Tests fallaron${NC}"
    echo -e "   ${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    log_error "Los tests fallaron. Abortando deploy."
    echo ""
    echo "Output de tests:"
    echo "─────────────────────────────────────────────"
    cat "$TEST_LOG"
    echo "─────────────────────────────────────────────"
    exit 1
fi

# Limpiar log temporal
rm -f "$TEST_LOG"

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

# Detener servicios existentes (ignorar errores si no existen)
pm2 stop all 2>/dev/null || true

# Iniciar/reiniciar con ecosystem.config.js
pm2 start ecosystem.config.js

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
echo "  Web:       http://56.125.148.180"
echo "  API:       http://56.125.148.180/api"
echo "  Analytics: http://56.125.148.180/analytics"
echo ""

