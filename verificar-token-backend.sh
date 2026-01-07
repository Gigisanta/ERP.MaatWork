#!/bin/bash

# Script para verificar si el backend puede validar el token

TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "Uso: ./verificar-token-backend.sh <token>"
  echo ""
  echo "Ejemplo:"
  echo "  ./verificar-token-backend.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

echo "=== Verificación de Token en Backend ==="
echo ""

echo "1. Probando endpoint /v1/auth/me con el token..."
echo "----------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Cookie: token=$TOKEN" http://localhost:3001/v1/auth/me)
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Token válido - El backend puede validar el token"
else
  echo "❌ Token inválido o no se está recibiendo"
  echo ""
  echo "2. Verificando logs del API..."
  echo "----------------------------------------"
  pm2 logs api --lines 20 --nostream | tail -20
  echo ""
  echo "3. Verificando JWT_SECRET..."
  echo "----------------------------------------"
  API_SECRET=$(pm2 env 0 | grep JWT_SECRET | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  echo "JWT_SECRET en API: ${API_SECRET:0:20}..."
  echo ""
  echo "4. Decodificando el token para verificar..."
  echo "----------------------------------------"
  # Decodificar el payload del token (sin verificar firma)
  PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "No se pudo decodificar")
  echo "$PAYLOAD"
fi

echo ""
echo "=== Próximos Pasos ==="
echo ""
if [ "$HTTP_STATUS" != "200" ]; then
  echo "Si el token no es válido:"
  echo "1. Verificar que JWT_SECRET coincide entre API y el token"
  echo "2. Verificar que el token no ha expirado"
  echo "3. Verificar logs del API para ver el error específico"
fi
