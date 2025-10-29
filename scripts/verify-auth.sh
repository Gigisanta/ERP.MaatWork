#!/bin/bash

# ========================================
# Script de Verificación del Sistema de Autenticación
# ========================================

echo "🔧 Verificando sistema de autenticación..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar resultados
show_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Verificar que los archivos .env existen
echo -e "\n${YELLOW}1. Verificando archivos de configuración...${NC}"

if [ -f "apps/api/.env" ]; then
    show_result 0 "Archivo apps/api/.env existe"
else
    show_result 1 "Archivo apps/api/.env NO existe"
fi

if [ -f "apps/web/.env.local" ]; then
    show_result 0 "Archivo apps/web/.env.local existe"
else
    show_result 1 "Archivo apps/web/.env.local NO existe"
fi

# Verificar que JWT_SECRET está configurado en ambos archivos
echo -e "\n${YELLOW}2. Verificando JWT_SECRET...${NC}"

API_JWT_SECRET=$(grep "JWT_SECRET=" apps/api/.env 2>/dev/null | cut -d'=' -f2)
WEB_JWT_SECRET=$(grep "JWT_SECRET=" apps/web/.env.local 2>/dev/null | cut -d'=' -f2)

if [ "$API_JWT_SECRET" = "$WEB_JWT_SECRET" ] && [ -n "$API_JWT_SECRET" ]; then
    show_result 0 "JWT_SECRET sincronizado entre API y Web"
else
    show_result 1 "JWT_SECRET NO sincronizado o faltante"
    echo "  API: $API_JWT_SECRET"
    echo "  Web: $WEB_JWT_SECRET"
fi

# Verificar que la API está corriendo
echo -e "\n${YELLOW}3. Verificando API...${NC}"

API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$API_RESPONSE" = "200" ]; then
    show_result 0 "API está corriendo en puerto 3001"
else
    show_result 1 "API NO está corriendo en puerto 3001 (código: $API_RESPONSE)"
fi

# Verificar que el frontend está corriendo
echo -e "\n${YELLOW}4. Verificando Frontend...${NC}"

WEB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$WEB_RESPONSE" = "200" ]; then
    show_result 0 "Frontend está corriendo en puerto 3000"
else
    show_result 1 "Frontend NO está corriendo en puerto 3000 (código: $WEB_RESPONSE)"
fi

# Verificar endpoint de login
echo -e "\n${YELLOW}5. Verificando endpoint de login...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}' \
    -w "%{http_code}" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "401\|400"; then
    show_result 0 "Endpoint de login responde correctamente (401/400 esperado para credenciales inválidas)"
else
    show_result 1 "Endpoint de login no responde correctamente"
fi

echo -e "\n${YELLOW}📋 Instrucciones para prueba manual:${NC}"
echo "1. Abre http://localhost:3000 en tu navegador"
echo "2. Intenta acceder a /contacts (debería redirigir a /login)"
echo "3. Haz login con:"
echo "   Email: giolivosantarelli@gmail.com"
echo "   Password: admin123"
echo "4. Verifica que seas redirigido a /contacts sin problemas"
echo "5. Refresca la página y verifica que la sesión persiste"
echo "6. Haz logout y verifica que seas redirigido al login"

echo -e "\n${GREEN}🎉 Verificación completada!${NC}"

