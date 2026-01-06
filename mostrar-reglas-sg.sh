#!/bin/bash
# Script para mostrar reglas actuales del Security Group
# Ejecuta en el servidor: chmod +x mostrar-reglas-sg.sh && ./mostrar-reglas-sg.sh

SG_ID="sg-0bac7f0374851e03a"
REGION="sa-east-1"

echo "=========================================="
echo "🔍 Reglas Actuales del Security Group"
echo "=========================================="
echo "Security Group ID: $SG_ID"
echo "Region: $REGION"
echo ""

# Verificar si AWS CLI está instalado
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no está instalado"
    echo ""
    echo "Instala AWS CLI o ejecuta desde AWS Console:"
    echo "EC2 → Security Groups → $SG_ID → Inbound rules"
    exit 1
fi

# Obtener todas las reglas de entrada
echo "=== Reglas de Entrada (Inbound) ==="
echo ""

RULES=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions' \
  --output json 2>/dev/null)

if [ -z "$RULES" ] || [ "$RULES" = "[]" ]; then
    echo "⚠️  No se encontraron reglas de entrada"
    echo "   O no tienes permisos para verlas"
else
    # Mostrar reglas en formato tabla
    echo "Formato: Protocolo | Puerto | Source | Descripción"
    echo "---------------------------------------------------"
    
    echo "$RULES" | jq -r '.[] | 
        "\(.IpProtocol) | \(.FromPort // "N/A")-\(.ToPort // "N/A") | \(.IpRanges[0].CidrIp // "N/A") | \(.IpRanges[0].Description // "Sin descripción")"
    ' 2>/dev/null || echo "$RULES"
    
    echo ""
    echo "=== Detalles Completos (JSON) ==="
    echo "$RULES" | jq '.'
fi

echo ""
echo "=== Verificar Regla HTTP (Puerto 80) ==="
HTTP_RULE=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` && IpProtocol==`tcp`]' \
  --output json 2>/dev/null)

if [ "$HTTP_RULE" != "[]" ] && [ -n "$HTTP_RULE" ]; then
    echo "✅ Existe regla para puerto 80 (HTTP):"
    echo "$HTTP_RULE" | jq -r '.[] | 
        "   Source: \(.IpRanges[0].CidrIp // "N/A")
   Descripción: \(.IpRanges[0].Description // "Sin descripción")"
    '
else
    echo "❌ NO existe regla para puerto 80 (HTTP)"
    echo "   Esta es la causa del error 521"
fi

echo ""
echo "=========================================="
echo "📋 Próximos Pasos"
echo "=========================================="
echo ""
echo "1. Copia el output completo de arriba"
echo "2. Compártelo conmigo"
echo "3. Te ayudo a agregar solo rangos de Cloudflare"
echo ""
echo "O ejecuta este comando y comparte el resultado:"
echo "aws ec2 describe-security-groups --group-ids $SG_ID --region $REGION --output json"
