#!/bin/bash
# Script para verificar si todos los rangos de Cloudflare están en el Security Group
# Ejecuta en el servidor: chmod +x verificar-rangos-cloudflare-completos.sh && ./verificar-rangos-cloudflare-completos.sh

SG_ID="sg-0bac7f0374851e03a"
REGION="sa-east-1"
PORT=80

echo "=========================================="
echo "🔍 Verificar Rangos de Cloudflare Completos"
echo "=========================================="
echo ""

# Obtener rangos actuales de Cloudflare
echo "=== Obteniendo Rangos Actuales de Cloudflare ==="
CF_IPV4_CURRENT=$(curl -s https://www.cloudflare.com/ips-v4)
CF_IPV6_CURRENT=$(curl -s https://www.cloudflare.com/ips-v6)

if [ -z "$CF_IPV4_CURRENT" ]; then
    echo "❌ No se pudieron obtener rangos de Cloudflare"
    exit 1
fi

echo "✅ Rangos IPv4 obtenidos: $(echo "$CF_IPV4_CURRENT" | wc -l | xargs)"
echo "✅ Rangos IPv6 obtenidos: $(echo "$CF_IPV6_CURRENT" | wc -l | xargs)"
echo ""

# Obtener rangos configurados en Security Group
echo "=== Obteniendo Rangos Configurados en Security Group ==="
SG_RULES=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`$PORT\` && IpProtocol==\`tcp\`]" \
  --output json 2>/dev/null)

if [ -z "$SG_RULES" ] || [ "$SG_RULES" = "[]" ]; then
    echo "❌ No se encontraron reglas para puerto $PORT"
    exit 1
fi

# Extraer rangos IPv4 del Security Group
SG_IPV4=$(echo "$SG_RULES" | jq -r '.[0].IpRanges[]?.CidrIp' 2>/dev/null | sort)
SG_IPV6=$(echo "$SG_RULES" | jq -r '.[0].Ipv6Ranges[]?.CidrIpv6' 2>/dev/null | sort)

# Comparar rangos
echo "=== Comparando Rangos ==="
echo ""

# IPv4
echo "Rangos IPv4 de Cloudflare (actuales):"
echo "$CF_IPV4_CURRENT" | sort > /tmp/cf_ipv4_current.txt
echo "$CF_IPV4_CURRENT" | sort

echo ""
echo "Rangos IPv4 en Security Group:"
echo "$SG_IPV4" > /tmp/sg_ipv4.txt
echo "$SG_IPV4"

echo ""
echo "=== Rangos Faltantes (IPv4) ==="
MISSING_IPV4=$(comm -23 /tmp/cf_ipv4_current.txt /tmp/sg_ipv4.txt 2>/dev/null)
if [ -z "$MISSING_IPV4" ]; then
    echo "✅ Todos los rangos IPv4 de Cloudflare están configurados"
else
    echo "❌ Faltan estos rangos IPv4:"
    echo "$MISSING_IPV4"
    echo ""
    echo "Para agregarlos, ejecuta:"
    echo "echo \"$MISSING_IPV4\" | while read cidr; do"
    echo "  aws ec2 authorize-security-group-ingress \\"
    echo "    --group-id $SG_ID \\"
    echo "    --protocol tcp \\"
    echo "    --port $PORT \\"
    echo "    --cidr \"\$cidr\" \\"
    echo "    --region $REGION \\"
    echo "    --description \"HTTP from Cloudflare IPv4\""
    echo "done"
fi

echo ""
echo "=== Rangos Extra (IPv4) ==="
EXTRA_IPV4=$(comm -13 /tmp/cf_ipv4_current.txt /tmp/sg_ipv4.txt 2>/dev/null)
if [ -z "$EXTRA_IPV4" ]; then
    echo "✅ No hay rangos extra (todos están en la lista de Cloudflare)"
else
    echo "⚠️  Estos rangos están en el Security Group pero NO en la lista actual de Cloudflare:"
    echo "$EXTRA_IPV4"
    echo "   (Pueden ser rangos antiguos que Cloudflare ya no usa)"
fi

# IPv6
echo ""
echo "=== Rangos IPv6 ==="
echo "$CF_IPV6_CURRENT" | sort > /tmp/cf_ipv6_current.txt
echo "$SG_IPV6" > /tmp/sg_ipv6.txt

MISSING_IPV6=$(comm -23 /tmp/cf_ipv6_current.txt /tmp/sg_ipv6.txt 2>/dev/null)
if [ -z "$MISSING_IPV6" ]; then
    echo "✅ Todos los rangos IPv6 de Cloudflare están configurados"
else
    echo "❌ Faltan estos rangos IPv6:"
    echo "$MISSING_IPV6"
fi

# Limpiar archivos temporales
rm -f /tmp/cf_ipv4_current.txt /tmp/sg_ipv4.txt /tmp/cf_ipv6_current.txt /tmp/sg_ipv6.txt

echo ""
echo "=========================================="
echo "📋 Resumen"
echo "=========================================="
echo ""
echo "Si todos los rangos están configurados pero aún tienes error 521:"
echo "  1. Verifica Cloudflare SSL Mode está en 'Full' (no 'Flexible')"
echo "  2. Verifica DNS en Cloudflare apunta a la IP correcta"
echo "  3. Verifica que Cloudflare esté 'Proxied' (nube naranja)"
echo "  4. Prueba desde tu PC: Invoke-WebRequest -Uri 'http://56.125.148.180/health' -Method Head"
