#!/bin/bash

# Script para verificar que JWT_SECRET esté configurado correctamente en PM2

echo "=== Verificación de JWT_SECRET en PM2 ==="
echo ""

# Verificar JWT_SECRET en servicio 'api'
echo "1. Verificando JWT_SECRET en servicio 'api':"
API_JWT_SECRET=$(pm2 env 0 | grep JWT_SECRET | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$API_JWT_SECRET" ]; then
  echo "   ❌ JWT_SECRET NO está configurado en servicio 'api'"
else
  echo "   ✅ JWT_SECRET configurado: ${API_JWT_SECRET:0:20}..."
fi
echo ""

# Verificar JWT_SECRET en servicio 'web'
echo "2. Verificando JWT_SECRET en servicio 'web':"
WEB_JWT_SECRET=$(pm2 env 1 | grep JWT_SECRET | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$WEB_JWT_SECRET" ]; then
  echo "   ❌ JWT_SECRET NO está configurado en servicio 'web'"
else
  echo "   ✅ JWT_SECRET configurado: ${WEB_JWT_SECRET:0:20}..."
fi
echo ""

# Comparar valores
if [ -n "$API_JWT_SECRET" ] && [ -n "$WEB_JWT_SECRET" ]; then
  if [ "$API_JWT_SECRET" = "$WEB_JWT_SECRET" ]; then
    echo "✅ Los valores de JWT_SECRET coinciden entre 'api' y 'web'"
  else
    echo "❌ ERROR: Los valores de JWT_SECRET NO coinciden"
    echo "   Esto causará que los tokens no se validen correctamente"
    echo ""
    echo "   API JWT_SECRET: ${API_JWT_SECRET:0:20}..."
    echo "   WEB JWT_SECRET: ${WEB_JWT_SECRET:0:20}..."
  fi
elif [ -z "$API_JWT_SECRET" ] || [ -z "$WEB_JWT_SECRET" ]; then
  echo "❌ ERROR: Uno o ambos servicios no tienen JWT_SECRET configurado"
fi
echo ""

# Verificar en archivos .env
echo "3. Verificando JWT_SECRET en archivos .env:"
if [ -f "apps/api/.env" ]; then
  API_ENV_SECRET=$(grep "^JWT_SECRET=" apps/api/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$API_ENV_SECRET" ]; then
    echo "   ✅ apps/api/.env tiene JWT_SECRET: ${API_ENV_SECRET:0:20}..."
  else
    echo "   ⚠️  apps/api/.env no tiene JWT_SECRET configurado"
  fi
else
  echo "   ⚠️  apps/api/.env no existe"
fi

echo ""
echo "=== Recomendaciones ==="
echo ""
echo "Si los valores no coinciden o faltan:"
echo "1. Editar ecosystem.config.js y agregar JWT_SECRET a ambos servicios"
echo "2. Reiniciar PM2: pm2 restart all"
echo "3. Verificar nuevamente con este script"
echo ""
