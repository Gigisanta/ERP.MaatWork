#!/bin/bash
# Script para verificar y corregir Security Group
# Ejecuta en el servidor

SG_ID="sg-0bac7f0374851e03a"
REGION="sa-east-1"

echo "=== Verificando Security Group ==="
echo "Security Group ID: $SG_ID"
echo ""

# Ver reglas de entrada
echo "=== Reglas de Entrada Actuales ==="
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
  --output table

echo ""
echo "=== Verificando Puerto 80 (HTTP) ==="
HTTP_RULE=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` && IpProtocol==`tcp`]' \
  --output json)

if [ "$HTTP_RULE" != "[]" ] && [ -n "$HTTP_RULE" ]; then
    echo "✅ Regla HTTP (puerto 80) existe"
    echo "$HTTP_RULE" | jq -r '.[] | "   Desde: \(.IpRanges[0].CidrIp // "N/A")"'
else
    echo "❌ NO hay regla para puerto 80 (HTTP)"
    echo ""
    echo "=== Agregando regla HTTP ==="
    aws ec2 authorize-security-group-ingress \
      --group-id $SG_ID \
      --protocol tcp \
      --port 80 \
      --cidr 0.0.0.0/0 \
      --region $REGION \
      --description "HTTP from anywhere (Cloudflare)" && \
    echo "✅ Regla HTTP agregada" || \
    echo "❌ Error al agregar regla (puede que ya exista)"
fi

echo ""
echo "=== Verificando Puerto 443 (HTTPS) ==="
HTTPS_RULE=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`443` && IpProtocol==`tcp`]' \
  --output json)

if [ "$HTTPS_RULE" != "[]" ] && [ -n "$HTTPS_RULE" ]; then
    echo "✅ Regla HTTPS (puerto 443) existe"
    echo "$HTTPS_RULE" | jq -r '.[] | "   Desde: \(.IpRanges[0].CidrIp // "N/A")"'
else
    echo "⚠️  No hay regla para puerto 443 (HTTPS)"
    echo "   Si Cloudflare usa 'Full (Strict)', necesitas HTTPS"
fi

echo ""
echo "=== Resumen ==="
echo "Si Cloudflare tiene error 521, verifica:"
echo "  1. Security Group permite puerto 80 desde 0.0.0.0/0"
echo "  2. Cloudflare SSL Mode está en 'Full' (no 'Flexible')"
echo "  3. DNS en Cloudflare apunta a la IP correcta"
