#!/bin/bash

# Script to prepare the environment for PM2 deployment
set -e

echo "🚀 Preparing for deployment..."

# 1. Install Node dependencies
echo "📦 Installing Node dependencies..."
pnpm install

# 2. Setup Environment Variables
echo "🔧 Checking environment variables..."
if [ ! -f apps/api/.env ]; then
    echo "⚠️  apps/api/.env not found. Copying from config-example.env..."
    cp apps/api/config-example.env apps/api/.env
    echo "❗ Please review apps/api/.env and set your secrets!"
fi

if [ ! -f apps/web/.env ]; then
    echo "⚠️  apps/web/.env not found. Creating default..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001/v1" > apps/web/.env
    echo "NEXT_PUBLIC_WS_URL=ws://localhost:3001" >> apps/web/.env
    echo "❗ Please review apps/web/.env!"
fi

# 3. Build Applications
echo "🏗️  Building applications..."
# Build shared packages first, then apps
pnpm -F @maatwork/types build
pnpm -F @maatwork/ui build
pnpm -F @maatwork/db build
pnpm -F @maatwork/api build
pnpm -F @maatwork/web build

# 4. Python Dependencies
echo "🐍 Checking Python dependencies..."
node scripts/install-python-deps.js

echo "✅ Preparation complete!"
echo "👉 You can now run: pm2 start ecosystem.config.js"


