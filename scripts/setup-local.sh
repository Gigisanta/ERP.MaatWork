#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SETUP SCRIPT - Configuración inicial del proyecto
# ═══════════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configurando proyecto MaatWork...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Instalar desde: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js: $(node -v)"

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Instalando pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm: $(pnpm -v)"

# Instalar dependencias
echo "📦 Instalando dependencias..."
pnpm install

# Configurar git hooks (opcional)
if [ -d ".git" ]; then
    echo "🔧 Configurando git hooks..."
    pnpm dlx husky install 2>/dev/null || true
fi

# Crear archivos .env si no existen
if [ ! -f "apps/api/.env" ]; then
    echo "📝 Creando apps/api/.env..."
    cp apps/api/.env.example apps/api/.env
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo "📝 Creando apps/web/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > apps/web/.env.local
fi

# Build inicial
echo "🏗️ Ejecutando build inicial..."
pnpm build

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup completo!                                                       ║"
echo "║                                                                          ║"
echo "║  Para desarrollo:                                                        ║"
echo "║    pnpm dev                                                              ║"
echo "║                                                                          ║"
echo "║  Para deploy (requiere configuración previa):                          ║"
echo "║    ./scripts/deploy-local.sh all                                        ║"
echo "║                                                                          ║"
echo "║  Configurar servicios:                                                  ║"
echo "║    - Vercel: https://vercel.com                                        ║"
echo "║    - Render: https://render.com                                        ║"
echo "║    - Neon: https://neon.tech                                            ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
