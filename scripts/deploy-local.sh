#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# DEPLOY SCRIPT - MaatWork (Vercel + Render)
# ═══════════════════════════════════════════════════════════════════════════
# Uso: ./scripts/deploy-local.sh [web|api|db|all|verify]

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
WEB_URL="https://maatwork.vercel.app"
API_URL="https://maatwork-api.onrender.app"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    MAATWORK DEPLOY SCRIPT                                ║"
echo "║                    (Vercel + Render + Neon)                               ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Funciones
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 no está instalado${NC}"
        exit 1
    fi
}

deploy_web() {
    echo -e "${BLUE}🌐 Deploying Web App to Vercel...${NC}"
    
    check_command "vercel"
    
    cd apps/web
    vercel --prod
    cd ../..
    
    echo -e "${GREEN}✅ Web App deployed!${NC}"
}

deploy_api() {
    echo -e "${BLUE}🔧 Deploying API to Render...${NC}"
    
    if [ -z "$RENDER_API_KEY" ] || [ -z "$RENDER_SERVICE_ID" ]; then
        echo -e "${YELLOW}⚠️ RENDER_API_KEY o RENDER_SERVICE_ID no están configurados${NC}"
        echo -e "${YELLOW}   Configúralos como variables de entorno${NC}"
        exit 1
    fi
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
        -d '{"clearCache": "clear"}'
    
    echo -e "${GREEN}✅ API deploy triggered!${NC}"
}

run_migrations() {
    echo -e "${BLUE}🗃️ Running database migrations...${NC}"
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⚠️ DATABASE_URL no está configurado${NC}"
        exit 1
    fi
    
    cd apps/api
    npx prisma migrate deploy
    cd ../..
    
    echo -e "${GREEN}✅ Migrations complete!${NC}"
}

verify() {
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    
    echo -e "  Checking Web App..."
    web_status=$(curl -s -o /dev/null -w "%{http_code}" $WEB_URL || echo "000")
    if [ "$web_status" = "200" ] || [ "$web_status" = "304" ]; then
        echo -e "  ${GREEN}✅ Web: $WEB_URL (HTTP $web_status)${NC}"
    else
        echo -e "  ${RED}❌ Web: $WEB_URL (HTTP $web_status)${NC}"
    fi
    
    echo -e "  Checking API..."
    api_response=$(curl -s $API_URL/health || echo '{"status":"error"}')
    echo -e "  ${GREEN}✅ API: $API_URL/health${NC}"
    echo "     Response: $api_response"
    
    echo -e "${GREEN}✅ Verification complete!${NC}"
}

case "$1" in
    web)
        deploy_web
        ;;
    api)
        deploy_api
        ;;
    db)
        run_migrations
        ;;
    all)
        deploy_api
        sleep 30
        run_migrations
        deploy_web
        verify
        ;;
    verify)
        verify
        ;;
    *)
        echo "Uso: $0 [web|api|db|all|verify]"
        echo ""
        echo "Comandos:"
        echo "  web    - Deploy solo Web App (Vercel)"
        echo "  api    - Deploy solo API (Render)"
        echo "  db     - Ejecutar migraciones"
        echo "  all    - Deploy todo"
        echo "  verify - Verificar estado"
        echo ""
        echo "Variables de entorno requeridas:"
        echo "  RENDER_API_KEY     - API Key de Render"
        echo "  RENDER_SERVICE_ID  - ID del servicio en Render"
        echo "  DATABASE_URL       - Connection string de Neon"
        exit 1
        ;;
esac

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║  URLs:                                                                    ║"
echo "║  🌐 Web:  $WEB_URL                                     ║"
echo "║  🔧 API:  $API_URL                                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
